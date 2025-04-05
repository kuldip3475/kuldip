import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./use-auth";
import { Message, WSMessage } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface WebSocketContextType {
  connected: boolean;
  sendMessage: (receiverId: number, content: string) => void;
  sendReadReceipt: (messageId: number) => void;
  sendTypingStatus: (receiverId: number, isTyping: boolean) => void;
  typingUsers: Record<number, boolean>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, boolean>>({});
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Only connect when user is authenticated
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      // Authenticate the connection
      socket.send(JSON.stringify({
        type: 'authenticate',
        payload: { userId: user.id }
      }));
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        
        switch (data.type) {
          case 'message':
            const message = data.payload as Message;
            // Invalidate conversation list
            queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
            // Invalidate or update specific conversation messages
            queryClient.invalidateQueries({ 
              queryKey: ['/api/messages', message.senderId] 
            });
            break;
            
          case 'message_sent':
            const sentMessage = data.payload as Message;
            // Update the conversation list
            queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
            // Update the conversation with this contact
            queryClient.invalidateQueries({ 
              queryKey: ['/api/messages', sentMessage.receiverId] 
            });
            break;
            
          case 'read_receipt':
            // Update message status in the UI
            const { messageId } = data.payload;
            queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
            break;
            
          case 'typing':
            const { senderId, isTyping } = data.payload;
            setTypingUsers(prev => ({
              ...prev,
              [senderId]: isTyping
            }));
            break;
            
          case 'status_change':
            const { userId, isOnline } = data.payload;
            // Update contact status in the UI
            queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [user]);

  const sendMessage = (receiverId: number, content: string) => {
    if (
      !socketRef.current || 
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socketRef.current.send(JSON.stringify({
      type: 'message',
      payload: { receiverId, content }
    }));
  };

  const sendReadReceipt = (messageId: number) => {
    if (
      !socketRef.current || 
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socketRef.current.send(JSON.stringify({
      type: 'read_receipt',
      payload: { messageId }
    }));
  };

  const sendTypingStatus = (receiverId: number, isTyping: boolean) => {
    if (
      !socketRef.current || 
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    socketRef.current.send(JSON.stringify({
      type: 'typing',
      payload: { receiverId, isTyping }
    }));
  };

  return (
    <WebSocketContext.Provider 
      value={{ 
        connected, 
        sendMessage, 
        sendReadReceipt,
        sendTypingStatus,
        typingUsers
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
