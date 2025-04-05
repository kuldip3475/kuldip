import { Link, useLocation } from "wouter";
import { Home, MessageSquare, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="flex items-center justify-around h-16">
        <NavItem path="/" label="Home" icon={Home} active={location === '/'} />
        <NavItem 
          path="/messages" 
          label="Messages" 
          icon={MessageSquare} 
          active={location === '/messages' || location.startsWith('/messages/')} 
        />
        <NavItem 
          path="/contacts" 
          label="Contacts" 
          icon={Users} 
          active={location === '/contacts'} 
        />
        <NavItem 
          path="/settings" 
          label="Settings" 
          icon={User} 
          active={location === '/settings'} 
        />
      </div>
    </div>
  );
}

interface NavItemProps {
  path: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  badge?: number;
}

function NavItem({ path, label, icon: Icon, active, badge }: NavItemProps) {
  return (
    <Link href={path}>
      <a className={cn(
        "flex flex-col items-center justify-center w-full relative",
        active ? "text-primary" : "text-gray-500"
      )}>
        <Icon className="h-6 w-6" />
        <span className="text-xs mt-1">{label}</span>
        {badge && badge > 0 && (
          <span className="absolute top-0 right-1/4 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </a>
    </Link>
  );
}
