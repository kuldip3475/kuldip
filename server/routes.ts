import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { WSMessage } from "@shared/schema";
import WebSocket from "ws";

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // API Routes
  app.get("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contacts = await storage.getContacts(req.user.id);
      res.json(contacts);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }
      
      const contact = await storage.getUserByUsername(username);
      if (!contact) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (contact.id === req.user.id) {
        return res.status(400).json({ error: "Cannot add yourself as a contact" });
      }
      
      // Check if already a contact
      const contacts = await storage.getContacts(req.user.id);
      if (contacts.some(c => c.id === contact.id)) {
        return res.status(400).json({ error: "User is already in your contacts" });
      }
      
      const newContact = await storage.addContact({
        userId: req.user.id,
        contactId: contact.id
      });
      
      res.status(201).json({ ...newContact, contactDetails: contact });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/contacts/:contactId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact ID" });
      }
      
      const success = await storage.removeContact(req.user.id, contactId);
      if (!success) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/messages/:contactId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact ID" });
      }
      
      const messages = await storage.getMessages(req.user.id, contactId);
      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { receiverId, content } = req.body;
      if (!receiverId || !content) {
        return res.status(400).json({ error: "Receiver ID and content are required" });
      }
      
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Receiver not found" });
      }
      
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId,
        content
      });
      
      res.status(201).json(message);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/messages/:messageId/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ error: "Invalid message ID" });
      }
      
      const message = await storage.markMessageAsRead(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      res.json(message);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversations = await storage.getRecentConversations(req.user.id);
      res.json(conversations);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Map to store active connections with their user IDs
  const clients = new Map<number, WebSocket>();
  
  wss.on('connection', (ws, req) => {
    let userId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString()) as WSMessage;
        
        // Handle authentication message
        if (data.type === 'authenticate') {
          userId = data.payload.userId;
          
          // Store the connection
          if (userId) {
            clients.set(userId, ws);
            await storage.updateUserStatus(userId, true);
            
            // Broadcast online status to all connected users
            const statusUpdate: WSMessage = {
              type: 'status_change',
              payload: { userId, isOnline: true }
            };
            
            for (const [clientId, client] of clients.entries()) {
              if (clientId !== userId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(statusUpdate));
              }
            }
          }
        }
        // Handle new message
        else if (data.type === 'message' && userId) {
          const { receiverId, content } = data.payload;
          
          // Save message to database
          const message = await storage.createMessage({
            senderId: userId,
            receiverId,
            content
          });
          
          // Send to receiver if online
          const receiverWs = clients.get(receiverId);
          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({
              type: 'message',
              payload: message
            }));
          }
          
          // Confirm to sender
          ws.send(JSON.stringify({
            type: 'message_sent',
            payload: message
          }));
        }
        // Handle read receipt
        else if (data.type === 'read_receipt' && userId) {
          const { messageId } = data.payload;
          
          // Mark message as read
          const message = await storage.markMessageAsRead(messageId);
          
          if (message) {
            // Notify sender if online
            const senderWs = clients.get(message.senderId);
            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
              senderWs.send(JSON.stringify({
                type: 'read_receipt',
                payload: { messageId, readAt: new Date() }
              }));
            }
          }
        }
        // Handle typing indicator
        else if (data.type === 'typing' && userId) {
          const { receiverId, isTyping } = data.payload;
          
          // Notify receiver if online
          const receiverWs = clients.get(receiverId);
          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({
              type: 'typing',
              payload: { senderId: userId, isTyping }
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', async () => {
      if (userId) {
        // Remove client from active connections
        clients.delete(userId);
        
        // Update user status to offline
        await storage.updateUserStatus(userId, false);
        
        // Broadcast offline status to all connected users
        const statusUpdate: WSMessage = {
          type: 'status_change',
          payload: { userId, isOnline: false }
        };
        
        for (const client of clients.values()) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(statusUpdate));
          }
        }
      }
    });
  });

  return httpServer;
}
