
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Bell, 
  Settings, 
  LogOut,
  User,
  Menu,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { UserSearch } from './UserSearch';
import { logoutUser } from '@/utils/authUtils';

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
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    async function getUserProfile() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        
        const { data } = await supabase
          .from('profiles')
          .select('name, username, avatar')
          .eq('id', authUser.id)
          .single();
          
        if (data) {
          setUser({
            id: authUser.id,
            name: data.name || 'User',
            username: data.username || 'guest',
            avatar: data.avatar || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }
    
    getUserProfile();
  }, []);
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log out',
      });
    }
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
          {user?.avatar ? (
            <AvatarImage src={user.avatar} alt={user?.name} />
          ) : (
            <AvatarFallback className="bg-primary/20 text-primary">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GU'}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <h3 className="font-medium">{user?.name || 'Guest'}</h3>
          <p className="text-xs text-muted-foreground">@{user?.username || 'guest'}</p>
        </div>
      </div>
      
      <div className="px-4 mt-2">
        <UserSearch />
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
      <>
        <Button variant="outline" size="icon" className="fixed top-4 left-4 z-50 lg:hidden bg-background border-2">
          <Sheet>
            <SheetTrigger asChild>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent onLinkClick={() => document.body.click()} />
            </SheetContent>
          </Sheet>
        </Button>
      </>
    );
  }
  
  return (
    <aside className="w-64 border-r h-screen sticky top-0 bg-background">
      <SidebarContent />
    </aside>
  );
}

export default Sidebar;
