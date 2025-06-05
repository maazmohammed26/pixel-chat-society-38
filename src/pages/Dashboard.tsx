
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { StoriesContainer } from '@/components/stories/StoriesContainer';
import { PostCreator } from '@/components/dashboard/PostCreator';
import { ScrollToTop } from '@/components/common/ScrollToTop';

export function Dashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-full flex flex-col">
        {/* Stories Container */}
        <div className="shrink-0">
          <StoriesContainer />
        </div>
        
        {/* Content with hidden scrollbar */}
        <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="p-2 space-y-4">
            {/* Post Creator - What's on your mind box */}
            <div id="post-creator">
              <PostCreator />
            </div>
            
            {/* Community Feed */}
            <CommunityFeed />
          </div>
        </div>
        
        {/* Scroll to Top Button */}
        <ScrollToTop targetElementId="post-creator" />
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
