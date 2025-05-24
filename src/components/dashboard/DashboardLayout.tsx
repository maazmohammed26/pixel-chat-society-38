
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

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <div className="dev-banner text-xs font-pixelated">
        This project is still under development by Mohammed Maaz A. Please share your feedback!
      </div>
      <MobileHeader />
      <div className="flex flex-1 w-full">
        <div className="flex-1 w-full">
          {!isMobile && (
            <div className="border-b sticky top-0 bg-background z-10 px-4 sm:px-6 pt-3 sm:pt-4">
              <Tabs value={currentRoute} className="w-full mb-3 sm:mb-4">
                <TabsList className="nav-tabs w-fit overflow-x-auto">
                  <TabsTrigger 
                    value="dashboard" 
                    onClick={() => navigate('/dashboard')}
                    className={`nav-tab ${currentRoute === 'dashboard' ? 'active' : ''} text-xs sm:text-sm font-pixelated`}
                  >
                    <Home className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Home
                  </TabsTrigger>
                  <TabsTrigger 
                    value="friends" 
                    onClick={() => navigate('/friends')}
                    className={`nav-tab ${currentRoute === 'friends' ? 'active' : ''} text-xs sm:text-sm font-pixelated`}
                  >
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Friends
                  </TabsTrigger>
                  <TabsTrigger 
                    value="messages" 
                    onClick={() => navigate('/messages')}
                    className={`nav-tab ${currentRoute === 'messages' ? 'active' : ''} text-xs sm:text-sm font-pixelated`}
                  >
                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Messages
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notifications" 
                    onClick={() => navigate('/notifications')}
                    className={`nav-tab ${currentRoute === 'notifications' ? 'active' : ''} text-xs sm:text-sm font-pixelated`}
                  >
                    <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger 
                    value="profile" 
                    onClick={() => navigate('/profile')}
                    className={`nav-tab ${currentRoute === 'profile' ? 'active' : ''} text-xs sm:text-sm font-pixelated`}
                  >
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Profile
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          <main className={`p-3 sm:p-6 w-full ${isMobile ? 'pb-20 pt-28' : ''} overflow-x-hidden`}>
            <div className="w-full max-w-full overflow-hidden">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
