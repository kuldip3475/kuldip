import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User, Message } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";
import { format, isToday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Conversation {
  contact: User;
  lastMessage: Message;
}

export function ConversationList() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  const formatMessageTime = (date: Date) => {
    if (isToday(new Date(date))) {
      return format(new Date(date), "h:mm a");
    }
    return format(new Date(date), "MMM d");
  };

  const truncateMessage = (message: string, maxLength = 30) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-gray-100 p-4 rounded-full mb-4">
          <MessageSquareIcon className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">No conversations yet</h3>
        <p className="text-sm text-gray-500 mb-4">
          Start messaging with your contacts to see conversations here.
        </p>
        <Link href="/contacts">
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Find Contacts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => {
        const isActive = location === `/messages/${conversation.contact.id}`;
        
        return (
          <Link key={conversation.contact.id} href={`/messages/${conversation.contact.id}`}>
            <a className={cn(
              "flex items-center p-4 hover:bg-gray-50 transition-colors",
              isActive && "bg-gray-50"
            )}>
              <AvatarWithStatus
                name={conversation.contact.displayName}
                isOnline={conversation.contact.isOnline}
              />
              
              <div className="ml-3 flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-800">
                    {conversation.contact.displayName}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(conversation.lastMessage.sentAt)}
                  </span>
                </div>
                
                <div className="flex items-center mt-1">
                  <p className={cn(
                    "text-xs truncate flex-1",
                    conversation.lastMessage.isRead || conversation.lastMessage.senderId === user?.id
                      ? "text-gray-500"
                      : "text-gray-900 font-medium"
                  )}>
                    {conversation.lastMessage.senderId === user?.id && "You: "}
                    {truncateMessage(conversation.lastMessage.content)}
                  </p>
                  
                  {!conversation.lastMessage.isRead && 
                   conversation.lastMessage.senderId !== user?.id && (
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                      1
                    </span>
                  )}
                </div>
              </div>
            </a>
          </Link>
        );
      })}
    </div>
  );
}

// Helper Icon
function MessageSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// Import cn
import { cn } from "@/lib/utils";
