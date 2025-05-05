
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Bell, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

function SidebarLink({ to, icon, label, isActive, onClick }: SidebarLinkProps) {
  return (
    <Link to={to} onClick={onClick}>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={`w-full justify-start mb-1 ${
          isActive ? 'bg-primary/10 text-primary' : ''
        }`}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </Button>
    </Link>
  );
}

interface SidebarContentProps {
  onLinkClick?: () => void;
}

function SidebarContent({ onLinkClick }: SidebarContentProps) {
  const location = useLocation();
  const { toast } = useToast();
  
  // Get user from localStorage (in a real app this would be from a context)
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {
    name: 'Guest',
    username: 'guest',
    avatar: '',
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    
    // Redirect to home/login
    window.location.href = '/';
  };
  
  const links = [
    { to: '/dashboard', icon: <Home className="h-5 w-5" />, label: 'Home' },
    { to: '/friends', icon: <Users className="h-5 w-5" />, label: 'Friends' },
    { to: '/messages', icon: <MessageSquare className="h-5 w-5" />, label: 'Messages' },
    { to: '/notifications', icon: <Bell className="h-5 w-5" />, label: 'Notifications' },
    { to: '/profile', icon: <User className="h-5 w-5" />, label: 'Profile' },
    { to: '/settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{user.name}</h3>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
      </div>
      
      <nav className="mt-4 px-2 flex-1">
        {links.map((link) => (
          <SidebarLink
            key={link.to}
            to={link.to}
            icon={link.icon}
            label={link.label}
            isActive={location.pathname === link.to}
            onClick={onLinkClick}
          />
        ))}
      </nav>
      
      <div className="p-4 mt-auto border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className="ml-2">Logout</span>
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed top-4 left-4 z-50">
            <Users className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SidebarContent onLinkClick={() => document.body.click()} />
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <aside className="w-64 border-r h-screen sticky top-0 bg-background">
      <SidebarContent />
    </aside>
  );
}

export default Sidebar;
