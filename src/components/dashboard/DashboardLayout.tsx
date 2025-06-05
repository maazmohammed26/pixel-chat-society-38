
import React from 'react';
import { MobileHeader } from './MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Bell, MessageSquare, User } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const getRouteFromPath = (path: string) => {
    if (path === '/') return 'dashboard';
    if (path.startsWith('/profile/')) return 'profile';
    return path.split('/')[1];
  };

  const currentRoute = getRouteFromPath(currentPath);
  const isMessagesPage = currentPath === '/messages';

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <MobileHeader />
      <div className="flex flex-1 w-full">
        <div className="flex-1 w-full">
          {!isMobile && !isMessagesPage && (
            <div className="border-b sticky top-0 bg-background z-10 px-2 pt-2">
              <Tabs value={currentRoute} className="w-full mb-2">
                <TabsList className="nav-tabs w-fit overflow-x-auto bg-muted">
                  <TabsTrigger 
                    value="dashboard" 
                    onClick={() => navigate('/dashboard')}
                    className={`nav-tab ${currentRoute === 'dashboard' ? 'bg-green-600 text-white' : 'text-muted-foreground hover:text-foreground'} font-pixelated p-2 data-[state=active]:bg-green-600 data-[state=active]:text-white`}
                  >
                    <Home className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="friends" 
                    onClick={() => navigate('/friends')}
                    className={`nav-tab ${currentRoute === 'friends' ? 'bg-green-600 text-white' : 'text-muted-foreground hover:text-foreground'} font-pixelated p-2 data-[state=active]:bg-green-600 data-[state=active]:text-white`}
                  >
                    <Users className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="messages" 
                    onClick={() => navigate('/messages')}
                    className={`nav-tab ${currentRoute === 'messages' ? 'bg-green-600 text-white' : 'text-muted-foreground hover:text-foreground'} font-pixelated p-2 data-[state=active]:bg-green-600 data-[state=active]:text-white`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    onClick={() => navigate('/notifications')}
                    className={`nav-tab ${currentRoute === 'notifications' ? 'bg-green-600 text-white' : 'text-muted-foreground hover:text-foreground'} font-pixelated p-2 data-[state=active]:bg-green-600 data-[state=active]:text-white`}
                  >
                    <Bell className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger 
                    value="profile" 
                    onClick={() => navigate('/profile')}
                    className={`nav-tab ${currentRoute === 'profile' ? 'bg-green-600 text-white' : 'text-muted-foreground hover:text-foreground'} font-pixelated p-2 data-[state=active]:bg-green-600 data-[state=active]:text-white`}
                  >
                    <User className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          <main className={`w-full ${isMobile ? 'pt-16 pb-16' : isMessagesPage ? '' : 'p-2'} overflow-x-hidden`}>
            <div className="w-full max-w-full overflow-hidden h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
