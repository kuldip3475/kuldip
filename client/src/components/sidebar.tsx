import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { AvatarWithStatus } from "@/components/ui/avatar-with-status";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  Home,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const NavItem = ({ path, label, icon: Icon }: { path: string, label: string, icon: React.ElementType }) => (
    <Link href={path}>
      <a 
        className={cn(
          "flex items-center px-3 py-2 rounded-md transition-colors",
          location === path 
            ? "bg-primary text-white" 
            : "text-gray-700 hover:bg-gray-100",
          isCollapsed && "justify-center"
        )}
        onClick={mobile ? onClose : undefined}
      >
        <Icon className={cn("h-5 w-5", location !== path && "text-gray-500")} />
        {!isCollapsed && <span className="ml-3 text-sm font-medium">{label}</span>}
      </a>
    </Link>
  );

  return (
    <div 
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 shadow-sm",
        mobile ? "h-full w-full" : "hidden md:flex w-64",
        isCollapsed && !mobile && "w-16"
      )}
    >
      {/* App Logo and Title */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
            M
          </div>
          {!isCollapsed && <h1 className="text-xl font-bold text-gray-800">Messenger</h1>}
        </div>
        {!mobile && (
          <button 
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* User Profile */}
      <div className={cn("p-4 border-b border-gray-200", isCollapsed && "flex justify-center")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "space-x-3")}>
          <AvatarWithStatus 
            name={user?.displayName || "User"} 
            isOnline={user?.isOnline} 
            size={isCollapsed ? "sm" : "md"}
          />
          {!isCollapsed && (
            <div>
              <p className="font-medium text-gray-800">{user?.displayName}</p>
              <p className="text-xs text-gray-500">{user?.username}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        <NavItem path="/" label="Dashboard" icon={Home} />
        <NavItem path="/messages" label="Messages" icon={MessageSquare} />
        <NavItem path="/contacts" label="Contacts" icon={Users} />
        <NavItem path="/settings" label="Settings" icon={Settings} />
      </nav>
      
      {/* Logout Button */}
      <div className={cn("p-4 border-t border-gray-200", isCollapsed && "flex justify-center")}>
        <Button
          variant="outline"
          className={cn(
            "w-full flex items-center justify-center text-gray-700",
            isCollapsed && "w-10 h-10 p-0"
          )}
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 text-gray-500" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );
}
