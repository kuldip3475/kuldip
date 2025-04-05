import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { User, Message } from "@shared/schema";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { MessageItem } from "@/components/message-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { debounce } from "@/lib/utils";

interface ChatWindowProps {
  contactId: number;
}

export function ChatWindow({ contactId }: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { sendMessage, sendReadReceipt, sendTypingStatus, typingUsers } = useWebSocket();
  
  // Get contact details
  const { data: contact, isLoading: isLoadingContact } = useQuery<User>({
    queryKey: ['/api/contacts', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) {
        throw new Error('Failed to load contact');
      }
      return res.json();
    },
  });
  
  // Get messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/messages', contactId],
  });

  // Mark messages as read when they are viewed
  useEffect(() => {
    if (messages) {
      const unreadMessages = messages.filter(
        message => !message.isRead && message.senderId === contactId
      );
      
      unreadMessages.forEach(message => {
        // Mark as read in the UI
        sendReadReceipt(message.id);
        
        // Mark as read in the database
        apiRequest("PATCH", `/api/messages/${message.id}/read`);
      });
      
      if (unreadMessages.length > 0) {
        // Invalidate queries to update UI
        queryClient.invalidateQueries({ queryKey: ['/api/messages', contactId] });
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
    }
  }, [messages, contactId, sendReadReceipt]);

  // Set up debounced typing indicator
  const debouncedTypingStatus = debounce((isTyping: boolean) => {
    if (contactId) {
      sendTypingStatus(contactId, isTyping);
    }
  }, 500);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    debouncedTypingStatus(e.target.value.length > 0);
    
    // When input is cleared, immediately send stopped typing
    if (e.target.value.length === 0) {
      sendTypingStatus(contactId, false);
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/messages", {
        receiverId: contactId,
        content
      });
    },
    onSuccess: () => {
      // Clear input and typing indicator
      setInputValue("");
      sendTypingStatus(contactId, false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle send message
  const handleSendMessage = () => {
    if (inputValue.trim() && contactId) {
      // Optimistically send via WebSocket for real-time delivery
      sendMessage(contactId, inputValue.trim());
      
      // Also send via REST API as a backup
      sendMessageMutation.mutate(inputValue.trim());
    }
  };

  // Handle key press for sending message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle back button
  const handleBack = () => {
    navigate("/messages");
  };

  const isTyping = typingUsers[contactId];

  if (isLoadingContact) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
          <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="ml-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex mb-4 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className={`h-12 w-48 rounded-lg ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center p-4 border-b">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <AvatarWithStatus
          name={contact.displayName}
          isOnline={contact.isOnline}
        />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-gray-800">{contact.displayName}</h3>
          <p className="text-xs text-gray-500">
            {contact.isOnline ? 'Online' : 'Offline'}
            {isTyping && <span className="ml-2 italic">typing...</span>}
          </p>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {isLoadingMessages ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className={`flex mb-4 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className={`h-12 w-48 rounded-lg ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
            </div>
          ))
        ) : messages && messages.length > 0 ? (
          messages.map((message, index) => {
            // Determine if we should show the avatar
            // Only show avatar if the previous message was from a different user
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;
            
            return (
              <MessageItem
                key={message.id}
                message={message}
                contact={contact}
                showAvatar={showAvatar}
              />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Send className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No messages yet</h3>
            <p className="text-sm text-gray-500">
              Send a message to start the conversation with {contact.displayName}
            </p>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center">
          <Input
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="flex-1 mr-2"
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
