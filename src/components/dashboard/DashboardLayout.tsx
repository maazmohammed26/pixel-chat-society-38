
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

  // Hide navigation tabs on Messages page
  const showNavigationTabs = currentPath !== '/messages';

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <MobileHeader />
      <div className="flex flex-1 w-full">
        <div className="flex-1 w-full">
          {!isMobile && (
            <div className="border-b sticky top-0 bg-background z-10 px-4 py-3">
              <div className="flex items-center justify-between max-w-6xl mx-auto">
                <h1 className="text-xl font-bold text-green-600">SocialChat</h1>
                {showNavigationTabs && (
                  <Tabs value={currentRoute} className="flex-1 max-w-md mx-auto">
                    <TabsList className="grid w-full grid-cols-5 bg-gray-100">
                      <TabsTrigger 
                        value="dashboard" 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center justify-center p-3 data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-600 hover:bg-gray-200"
                      >
                        <Home className="h-5 w-5" />
                      </TabsTrigger>
                      <TabsTrigger 
                        value="friends" 
                        onClick={() => navigate('/friends')}
                        className="flex items-center justify-center p-3 data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-600 hover:bg-gray-200"
                      >
                        <Users className="h-5 w-5" />
                      </TabsTrigger>
                      <TabsTrigger 
                        value="messages" 
                        onClick={() => navigate('/messages')}
                        className="flex items-center justify-center p-3 data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-600 hover:bg-gray-200"
                      >
                        <MessageSquare className="h-5 w-5" />
                      </TabsTrigger>
                      <TabsTrigger 
                        value="notifications" 
                        onClick={() => navigate('/notifications')}
                        className="flex items-center justify-center p-3 data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-600 hover:bg-gray-200"
                      >
                        <Bell className="h-5 w-5" />
                      </TabsTrigger>
                      <TabsTrigger 
                        value="profile" 
                        onClick={() => navigate('/profile')}
                        className="flex items-center justify-center p-3 data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-600 hover:bg-gray-200"
                      >
                        <User className="h-5 w-5" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
                <div className="w-24"></div> {/* Spacer for balance */}
              </div>
            </div>
          )}
          <main className={`w-full ${isMobile ? 'pt-16 pb-16' : ''} overflow-x-hidden`}>
            <div className="w-full max-w-full overflow-hidden h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
