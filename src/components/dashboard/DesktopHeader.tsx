
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Bell, 
  User,
  Settings,
  Search,
  LogOut 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { UserSearch } from './UserSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { logoutUser } from '@/utils/authUtils';

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavLink({ to, icon, label, isActive }: NavLinkProps) {
  return (
    <Link to={to}>
      <Button
        variant="ghost"
        className={`flex items-center gap-2 ${
          isActive ? 'bg-social-dark-green text-white' : 'hover:bg-muted/50'
        }`}
      >
        {icon}
        {label}
      </Button>
    </Link>
  );
}

export function DesktopHeader() {
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
  ];

  return (
    <header className="border-b bg-background/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg">
              <span className="social-gradient bg-clip-text text-transparent">Social</span>
            </h1>
            
            <nav className="hidden md:flex ml-6 gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  icon={link.icon}
                  label={link.label}
                  isActive={location.pathname === link.to}
                />
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-64">
              <UserSearch />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                  <Avatar>
                    {user?.avatar ? (
                      <AvatarImage src={user.avatar} alt={user?.name} />
                    ) : (
                      <AvatarFallback className="bg-social-dark-green text-white">
                        {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GU'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name || 'Guest'}</span>
                    <span className="text-xs text-muted-foreground">@{user?.username || 'guest'}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
