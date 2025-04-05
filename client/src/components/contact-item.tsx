import { User } from "@shared/schema";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { Button } from "@/components/ui/button";
import { MessageSquare, MoreVertical, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ContactItemProps {
  contact: User;
}

export function ContactItem({ contact }: ContactItemProps) {
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const removeContactMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/contacts/${contact.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact removed",
        description: `${contact.displayName} has been removed from your contacts`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRemoveContact = useCallback(() => {
    removeContactMutation.mutate();
  }, [removeContactMutation]);

  const handleMessageContact = useCallback(() => {
    navigate(`/messages/${contact.id}`);
  }, [contact.id, navigate]);

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        <AvatarWithStatus
          name={contact.displayName}
          isOnline={contact.isOnline}
        />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-gray-800">{contact.displayName}</h3>
          <p className="text-xs text-gray-500">@{contact.username}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleMessageContact}
          title="Send message"
        >
          <MessageSquare className="h-5 w-5 text-gray-500" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleMessageContact}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-500 focus:text-red-500" 
              onClick={handleRemoveContact}
              disabled={removeContactMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove contact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
