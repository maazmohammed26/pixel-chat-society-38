
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { StoriesContainer } from '@/components/stories/StoriesContainer';

export function Dashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)]">
        {/* Stories Container - moved to top */}
        <StoriesContainer />
        
        {/* Content */}
        <div className="h-[calc(100vh-120px)] overflow-y-auto">
          <CommunityFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
