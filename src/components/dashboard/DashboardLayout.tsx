
import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { DesktopHeader } from './DesktopHeader';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isMobile ? <MobileHeader /> : <DesktopHeader />}
      <div className="flex flex-1">
        {!isMobile && <Sidebar />}
        <div className="flex-1">
          <main className={`p-6 ${isMobile ? 'mt-28' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
