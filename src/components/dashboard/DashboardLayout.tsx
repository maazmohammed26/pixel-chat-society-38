
import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { DesktopHeader } from './DesktopHeader';
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

  // Get the route without the leading slash
  const getRouteFromPath = (path: string) => {
    return path === '/' ? 'dashboard' : path.split('/')[1];
  };

  const currentRoute = getRouteFromPath(currentPath);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isMobile ? <MobileHeader /> : <DesktopHeader />}
      <div className="flex flex-1">
        {!isMobile && <Sidebar />}
        <div className="flex-1">
          {!isMobile && (
            <div className="border-b sticky top-0 bg-background z-10 px-6 pt-4">
              <Tabs value={currentRoute} className="w-full mb-4">
                <TabsList className="nav-tabs w-fit">
                  <TabsTrigger 
                    value="dashboard" 
                    onClick={() => navigate('/dashboard')}
                    className={`nav-tab ${currentRoute === 'dashboard' ? 'active' : ''}`}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </TabsTrigger>
                  <TabsTrigger 
                    value="friends" 
                    onClick={() => navigate('/friends')}
                    className={`nav-tab ${currentRoute === 'friends' ? 'active' : ''}`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Friends
                  </TabsTrigger>
                  <TabsTrigger 
                    value="messages" 
                    onClick={() => navigate('/messages')}
                    className={`nav-tab ${currentRoute === 'messages' ? 'active' : ''}`}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Messages
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    onClick={() => navigate('/notifications')}
                    className={`nav-tab ${currentRoute === 'notifications' ? 'active' : ''}`}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger 
                    value="profile" 
                    onClick={() => navigate('/profile')}
                    className={`nav-tab ${currentRoute === 'profile' ? 'active' : ''}`}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          <main className={`p-6 ${isMobile ? 'mt-28' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
