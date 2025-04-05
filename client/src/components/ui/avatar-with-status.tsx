import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarWithStatusProps {
  name: string;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarWithStatus({ 
  name, 
  isOnline = false,
  size = "md",
  className 
}: AvatarWithStatusProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const sizeClasses = {
    sm: {
      avatar: "h-8 w-8",
      status: "w-2 h-2",
    },
    md: {
      avatar: "h-10 w-10",
      status: "w-3 h-3",
    },
    lg: {
      avatar: "h-12 w-12",
      status: "w-3.5 h-3.5",
    },
  };

  const getRandomColor = (name: string) => {
    const colors = [
      "bg-indigo-100 text-indigo-800",
      "bg-pink-100 text-pink-800",
      "bg-green-100 text-green-800",
      "bg-blue-100 text-blue-800",
      "bg-purple-100 text-purple-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
      "bg-orange-100 text-orange-800",
    ];
    
    // Simple hash function for name to get consistent color
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className={cn("relative", className)}>
      <Avatar className={sizeClasses[size].avatar}>
        <AvatarFallback className={getRandomColor(name)}>
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <span className={cn(
        "absolute bottom-0 right-0 border-2 border-white rounded-full",
        sizeClasses[size].status,
        isOnline ? "bg-green-500" : "bg-gray-300"
      )} />
    </div>
  );
}
