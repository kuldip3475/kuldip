import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ContactItem } from "@/components/contact-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, UserPlus, Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: contacts, isLoading } = useQuery<User[]>({
    queryKey: ['/api/contacts'],
  });
  
  const addContactSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
  });
  
  const form = useForm<z.infer<typeof addContactSchema>>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      username: "",
    },
  });
  
  const addContactMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addContactSchema>) => {
      return await apiRequest("POST", "/api/contacts", data);
    },
    onSuccess: (response) => {
      const { contactDetails } = response;
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      form.reset();
      setAddContactDialogOpen(false);
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
  
  const onSubmit = (data: z.infer<typeof addContactSchema>) => {
    addContactMutation.mutate(data);
  };
  
  // Filter contacts based on search query
  const filteredContacts = contacts?.filter(contact => 
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h2 className="text-xl font-semibold text-gray-800">Contacts</h2>
            </div>
            <Button 
              onClick={() => setAddContactDialogOpen(true)}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Contact</span>
            </Button>
          </div>
        </header>
        
        {/* Contacts List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Contact List */}
          <div className="flex-1 overflow-y-auto bg-white">
            {isLoading ? (
              <div className="divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredContacts && filteredContacts.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <ContactItem key={contact.id} contact={contact} />
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                {searchQuery ? (
                  <>
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                      <Search className="h-6 w-6 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No contacts found</h3>
                    <p className="text-sm text-gray-500">
                      No contacts matching "{searchQuery}"
                    </p>
                  </>
                ) : (
                  <>
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                      <UserPlus className="h-6 w-6 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No contacts yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Add contacts to start messaging with them
                    </p>
                    <Button 
                      onClick={() => setAddContactDialogOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Contact
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile bottom navigation */}
      <MobileNav />
      
      {/* Add Contact Dialog */}
      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new contact</DialogTitle>
            <DialogDescription>
              Enter the username of the person you want to add
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
                  {addContactMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Contact
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
