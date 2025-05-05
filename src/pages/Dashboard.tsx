
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Dashboard() {
  return (
    <DashboardLayout>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold social-gradient bg-clip-text text-transparent">Welcome to PixelChat</CardTitle>
          <CardDescription>
            Share your thoughts, connect with friends, and join the community conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Get started by posting in the community feed or by exploring suggested friends.</p>
        </CardContent>
      </Card>
      
      <CommunityFeed />
    </DashboardLayout>
  );
}

export default Dashboard;
