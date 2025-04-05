import { useState } from "react";
import { useLocation, Route } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ConversationList } from "@/components/conversation-list";
import { ChatWindow } from "@/components/chat-window";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, PlusSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function MessagesLayout() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const { toast } = useToast();

  const newChatSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
  });

  const form = useForm<z.infer<typeof newChatSchema>>({
    resolver: zodResolver(newChatSchema),
    defaultValues: {
      username: "",
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newChatSchema>) => {
      return await apiRequest("POST", "/api/contacts", data);
    },
    onSuccess: (response) => {
      const { contactDetails } = response;
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      form.reset();
      setNewChatDialogOpen(false);
      toast({
        title: "Contact added",
        description: `${contactDetails.displayName} has been added to your contacts`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof newChatSchema>) => {
    addContactMutation.mutate(data);
  };

  const showConversationList = !location.match(/^\/messages\/\d+$/);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for desktop */}
      <Sidebar />
      
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0">
          <Sidebar mobile onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="h-16 flex items-center justify-between px-4">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
            </div>
            <Button 
              size="sm" 
              className="flex items-center" 
              onClick={() => setNewChatDialogOpen(true)}
            >
              <PlusSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </div>
        </header>
        
        {/* Message Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation List - always shown on desktop, conditionally on mobile */}
          {(showConversationList || window.innerWidth >= 768) && (
            <div className={`${showConversationList ? 'w-full md:w-1/3' : 'hidden md:block md:w-1/3'} border-r border-gray-200 bg-white overflow-y-auto`}>
              <ConversationList />
            </div>
          )}
          
          {/* Chat Window - replace with a route for handling different conversations */}
          <div className={`${showConversationList ? 'hidden md:block md:w-2/3' : 'w-full md:w-2/3'} overflow-y-auto bg-white`}>
            <Route path="/messages">
              <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <MessageSquareIcon className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Select a conversation</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Choose a contact from the list to start chatting
                </p>
                <Button 
                  onClick={() => setNewChatDialogOpen(true)}
                >
                  <PlusSquare className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </Route>
            <Route path="/messages/:id">
              {(params) => <ChatWindow contactId={parseInt(params.id)} />}
            </Route>
          </div>
        </div>
      </div>
      
      {/* Mobile bottom navigation */}
      <MobileNav />
      
      {/* New Chat Dialog */}
      <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
            <DialogDescription>
              Enter the username of the person you want to message
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={addContactMutation.isPending}
                >
                  {addContactMutation.isPending ? "Adding..." : "Start Chat"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
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

export default MessagesLayout;
