
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { StoriesContainer } from '@/components/stories/StoriesContainer';
import { PostCreator } from '@/components/dashboard/PostCreator';
import { ScrollToTop } from '@/components/common/ScrollToTop';

export function Dashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)]">
        {/* Stories Container */}
        <StoriesContainer />
        
        {/* Content */}
        <div className="h-[calc(100vh-180px)] overflow-y-auto p-2 scroll-container">
          {/* Post Creator - What's on your mind box */}
          <div id="post-creator">
            <PostCreator />
          </div>
          
          {/* Community Feed */}
          <CommunityFeed />
        </div>
        
        {/* Scroll to Top Button */}
        <ScrollToTop targetElementId="post-creator" />
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
