
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Bell, 
  User,
  Search,
  Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { UserSearch } from './UserSearch';

interface MobileTab {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export function MobileHeader() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  
  React.useEffect(() => {
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

  const tabs: MobileTab[] = [
    { path: '/dashboard', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { path: '/friends', label: 'Friends', icon: <Users className="h-5 w-5" /> },
    { path: '/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
    { path: '/notifications', label: 'Alerts', icon: <Bell className="h-5 w-5" /> },
    { path: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet>
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
                    <AvatarFallback className="bg-social-dark-green text-primary-foreground">
                      {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GU'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{user?.name || 'Guest'}</h3>
                  <p className="text-xs text-muted-foreground">@{user?.username || 'guest'}</p>
                </div>
              </div>
              
              <UserSearch />
            </SheetContent>
          </Sheet>
          
          <h1 className="font-bold text-lg">
            <span className="social-gradient bg-clip-text text-transparent">Social</span>
          </h1>
        </div>
        
        <div className="flex space-x-1">
          {user?.avatar ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user?.name} />
              <AvatarFallback className="bg-social-dark-green text-primary-foreground">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GU'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-social-dark-green text-primary-foreground">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GU'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
      
      <nav className="grid grid-cols-5 border-t">
        {tabs.map((tab) => (
          <Link 
            key={tab.path} 
            to={tab.path} 
            className={`flex flex-col items-center justify-center py-2 text-xs ${
              isActive(tab.path) 
                ? 'text-social-dark-green border-t-2 border-social-dark-green' 
                : 'text-muted-foreground'
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
