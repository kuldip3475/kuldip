import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CheckCheck } from "lucide-react";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { useAuth } from "@/hooks/use-auth";
import { Message, User } from "@shared/schema";

interface MessageItemProps {
  message: Message;
  contact: User;
  showAvatar?: boolean;
}

export function MessageItem({ message, contact, showAvatar = true }: MessageItemProps) {
  const { user } = useAuth();
  const isMyMessage = message.senderId === user?.id;
  const [isAnimating, setIsAnimating] = useState(true);

  // Stop animation after a short timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAnimating(false);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, []);

  const formatMessageTime = (date: Date) => {
    return format(new Date(date), "h:mm a");
  };

  return (
    <div
      className={cn(
        "flex mb-4 max-w-[85%]",
        isMyMessage ? "ml-auto" : "mr-auto",
        isAnimating && "message-animation"
      )}
    >
      {!isMyMessage && showAvatar && (
        <div className="flex-shrink-0 mr-2">
          <AvatarWithStatus 
            name={contact.displayName}
            isOnline={contact.isOnline}
            size="sm"
          />
        </div>
      )}
      
      <div className={cn(
        "p-3 rounded-lg",
        isMyMessage 
          ? "bg-primary text-white rounded-br-none" 
          : "bg-gray-100 text-gray-800 rounded-bl-none"
      )}>
        <p className="text-sm">{message.content}</p>
        <div className={cn(
          "flex items-center justify-end text-xs mt-1",
          isMyMessage ? "text-primary-foreground" : "text-gray-500"
        )}>
          <span className="mr-1">{formatMessageTime(message.sentAt)}</span>
          {isMyMessage && (
            <CheckCheck className={cn(
              "h-3 w-3",
              message.isRead ? "text-blue-400" : "text-gray-400"
            )} />
          )}
        </div>
      </div>

      {isMyMessage && showAvatar && (
        <div className="flex-shrink-0 ml-2">
          <AvatarWithStatus
            name={user?.displayName || "You"}
            isOnline={true}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
