
import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1">
        {isMobile && <MobileHeader />}
        <main className={`p-6 ${isMobile ? 'mt-28' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
