
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { StoriesContainer } from '@/components/stories/StoriesContainer';

export function Dashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative">
        {/* Stories Container at the top */}
        <StoriesContainer />
        
        {/* Community Feed */}
        <div className="min-h-screen">
          <CommunityFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
