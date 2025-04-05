import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  Clock,
  CheckCircle2,
  Plus,
  User as UserIcon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";

export default function HomePage() {
  const { user } = useAuth();
  
  // Get conversations data
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/conversations'],
  });
  
  // Get contacts data
  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['/api/contacts'],
  });

  const statsData = [
    {
      title: "Active Chats",
      value: conversations?.length || 0,
      icon: MessageSquare,
      color: "bg-primary bg-opacity-10 text-primary"
    },
    {
      title: "Contacts",
      value: contacts?.length || 0,
      icon: Users,
      color: "bg-pink-100 text-pink-800"
    },
    {
      title: "Unread Messages",
      value: conversations?.filter(c => 
        !c.lastMessage.isRead && c.lastMessage.senderId !== user?.id
      ).length || 0,
      icon: Clock,
      color: "bg-amber-100 text-amber-800"
    },
    {
      title: "Active Now",
      value: contacts?.filter(c => c.isOnline).length || 0,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-800"
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="h-16 flex items-center justify-between px-4">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-800 ml-2 md:ml-0">Dashboard</h2>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserIcon className="h-5 w-5 text-gray-500" />
                </Button>
              </Link>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-16 md:pb-4">
          {/* Welcome Section */}
          <section className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome back, {user?.displayName}
            </h1>
            <p className="text-gray-600">
              Here's an overview of your messaging activity
            </p>
          </section>
          
          {/* Stats Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsData.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
                    {isLoadingContacts || isLoadingConversations ? (
                      <Skeleton className="h-6 w-10 mt-1" />
                    ) : (
                      <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
          
          {/* Recent Activities Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Recent Messages */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Recent Messages</h2>
                <Link href="/messages">
                  <Button variant="link" className="text-primary">View All</Button>
                </Link>
              </div>
              
              <div className="divide-y divide-gray-200">
                {isLoadingConversations ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-10" />
                      </div>
                    </div>
                  ))
                ) : conversations && conversations.length > 0 ? (
                  conversations.slice(0, 3).map((conversation) => (
                    <Link key={conversation.contact.id} href={`/messages/${conversation.contact.id}`}>
                      <a className="flex items-center p-4 hover:bg-gray-50 transition-colors">
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
                              {new Date(conversation.lastMessage.sentAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {conversation.lastMessage.senderId === user?.id ? "You: " : ""}
                            {conversation.lastMessage.content}
                          </p>
                        </div>
                      </a>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 mb-4">No recent messages</p>
                    <Link href="/contacts">
                      <Button>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Start Messaging
                      </Button>
                    </Link>
                  </div>
                )}
                
                {conversations && conversations.length > 0 && (
                  <div className="p-4 text-center">
                    <Link href="/messages">
                      <Button variant="outline" className="w-full">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        See All Messages
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </section>
            
            {/* Contacts Section */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Contacts</h2>
                <Link href="/contacts">
                  <Button variant="link" className="text-primary">View All</Button>
                </Link>
              </div>
              
              <div className="divide-y divide-gray-200">
                {isLoadingContacts ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : contacts && contacts.length > 0 ? (
                  contacts.slice(0, 3).map((contact) => (
                    <Link key={contact.id} href={`/messages/${contact.id}`}>
                      <a className="flex items-center p-4 hover:bg-gray-50 transition-colors">
                        <AvatarWithStatus
                          name={contact.displayName}
                          isOnline={contact.isOnline}
                        />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-gray-800">{contact.displayName}</h3>
                          <p className="text-xs text-gray-500">@{contact.username}</p>
                        </div>
                      </a>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 mb-4">No contacts found</p>
                    <Link href="/contacts">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contacts
                      </Button>
                    </Link>
                  </div>
                )}
                
                {contacts && contacts.length > 0 && (
                  <div className="p-4 text-center">
                    <Link href="/contacts">
                      <Button variant="outline" className="w-full">
                        <Users className="mr-2 h-4 w-4" />
                        See All Contacts
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
