import { users, type User, type InsertUser, contacts, type Contact, type InsertContact, messages, type Message, type InsertMessage } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { MongoDBStorage } from "./mongodb-storage";
import { log } from "./vite";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: number, isOnline: boolean): Promise<User | undefined>;
  updateUserLastSeen(id: number): Promise<User | undefined>;
  
  // Contact operations
  getContacts(userId: number): Promise<User[]>;
  addContact(contact: InsertContact): Promise<Contact>;
  removeContact(userId: number, contactId: number): Promise<boolean>;
  
  // Message operations
  getMessages(userId: number, contactId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: number): Promise<Message | undefined>;
  getRecentConversations(userId: number): Promise<{contact: User, lastMessage: Message}[]>;
  
  // Session store
  sessionStore: session.Store;
  
  // Optional initialize method (for MongoDB)
  initialize?(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private messages: Map<number, Message>;
  sessionStore: session.Store;
  currentUserId: number;
  currentContactId: number;
  currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentContactId = 1;
    this.currentMessageId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      isOnline: false, 
      avatar: null, 
      lastSeen: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStatus(id: number, isOnline: boolean): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, isOnline };
    if (!isOnline) {
      updatedUser.lastSeen = new Date();
    }
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserLastSeen(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, lastSeen: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Contact operations
  async getContacts(userId: number): Promise<User[]> {
    const contactEntries = Array.from(this.contacts.values()).filter(
      (contact) => contact.userId === userId
    );
    
    const contactUsers = await Promise.all(
      contactEntries.map(async (contact) => 
        (await this.getUser(contact.contactId))!
      )
    );
    
    return contactUsers.filter(Boolean);
  }

  async addContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const contact: Contact = { ...insertContact, id };
    this.contacts.set(id, contact);
    return contact;
  }

  async removeContact(userId: number, contactId: number): Promise<boolean> {
    const contactEntry = Array.from(this.contacts.values()).find(
      (contact) => contact.userId === userId && contact.contactId === contactId
    );
    
    if (!contactEntry) return false;
    
    this.contacts.delete(contactEntry.id);
    return true;
  }

  // Message operations
  async getMessages(userId: number, contactId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => 
        (message.senderId === userId && message.receiverId === contactId) ||
        (message.senderId === contactId && message.receiverId === userId)
    ).sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      sentAt: new Date(),
      isRead: false 
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessageAsRead(messageId: number): Promise<Message | undefined> {
    const message = this.messages.get(messageId);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, isRead: true };
    this.messages.set(messageId, updatedMessage);
    return updatedMessage;
  }

  async getRecentConversations(userId: number): Promise<{contact: User, lastMessage: Message}[]> {
    // Get all messages where the user is either sender or receiver
    const userMessages = Array.from(this.messages.values()).filter(
      (message) => message.senderId === userId || message.receiverId === userId
    );
    
    // Group messages by the other participant (contact)
    const conversationMap = new Map<number, Message[]>();
    
    userMessages.forEach(message => {
      const contactId = message.senderId === userId ? message.receiverId : message.senderId;
      if (!conversationMap.has(contactId)) {
        conversationMap.set(contactId, []);
      }
      conversationMap.get(contactId)!.push(message);
    });
    
    // Get the most recent message for each conversation
    const conversations: {contact: User, lastMessage: Message}[] = [];
    
    for (const [contactId, msgs] of conversationMap.entries()) {
      const contact = await this.getUser(contactId);
      if (contact) {
        // Sort messages by sent time (newest first)
        msgs.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
        const lastMessage = msgs[0];
        
        conversations.push({
          contact,
          lastMessage
        });
      }
    }
    
    // Sort conversations by the last message time (newest first)
    return conversations.sort((a, b) => 
      b.lastMessage.sentAt.getTime() - a.lastMessage.sentAt.getTime()
    );
  }
}

// Choose which storage implementation to use
const USE_MONGODB = process.env.USE_MONGODB === 'true';

let storageInstance: IStorage;

if (USE_MONGODB) {
  log('Using MongoDB for storage', 'mongodb');
  storageInstance = new MongoDBStorage();
  
  // Initialize MongoDB collections
  (async () => {
    try {
      if (storageInstance.initialize) {
        await storageInstance.initialize();
      }
    } catch (error) {
      log(`Failed to initialize MongoDB storage: ${error}`, 'mongodb');
      log('Falling back to in-memory storage', 'mongodb');
      storageInstance = new MemStorage();
    }
  })();
} else {
  log('Using in-memory storage', 'storage');
  storageInstance = new MemStorage();
}

export const storage = storageInstance;
