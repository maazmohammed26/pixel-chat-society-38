
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Bell, 
  User,
  Search,
  Menu,
  LogOut
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { UserSearch } from './UserSearch';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileTab {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export function MobileHeader() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
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
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    } else {
      window.location.href = '/login';
    }
  };

  const tabs: MobileTab[] = [
    { path: '/dashboard', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { path: '/friends', label: 'Friends', icon: <Users className="h-5 w-5" /> },
    { path: '/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
    { path: '/notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" /> },
    { path: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-4 w-72">
              <div className="flex items-center gap-3 mb-6">
                <Avatar>
                  {user?.avatar ? (
                    <AvatarImage src={user.avatar} alt={user?.name} />
                  ) : (
                    <AvatarFallback className="bg-social-dark-green text-white">
                      {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GU'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{user?.name || 'Guest'}</h3>
                  <p className="text-xs text-muted-foreground">@{user?.username || 'guest'}</p>
                </div>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
              
              <UserSearch />
              
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Main Navigation</h4>
                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                        isActive(tab.path) 
                          ? 'bg-social-dark-green text-white'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <h1 className="font-bold text-lg">
            <span className="social-gradient bg-clip-text text-transparent">SocialChat</span>
          </h1>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 h-9 w-9 rounded-full">
              {user?.avatar ? (
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-social-dark-green text-white">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GU'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-social-dark-green text-white">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GU'}
                  </AvatarFallback>
                </Avatar>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link to="/profile">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
            </Link>
            <Link to="/settings">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <nav className="grid grid-cols-5 border-t">
        {tabs.map((tab) => (
          <Link 
            key={tab.path} 
            to={tab.path} 
            className={`flex flex-col items-center justify-center py-2 text-xs ${
              isActive(tab.path) 
                ? 'text-white bg-social-dark-green' 
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {tab.icon}
            <span className="mt-1">{tab.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
