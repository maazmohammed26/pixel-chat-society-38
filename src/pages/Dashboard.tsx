
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Dashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-pixelated social-gradient bg-clip-text text-transparent">
              Welcome to PixelChat
            </CardTitle>
            <CardDescription className="font-pixelated text-xs">
              Share your thoughts, connect with friends, and join the community conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-pixelated text-xs text-muted-foreground">
              Get started by posting in the community feed or by exploring suggested friends.
            </p>
          </CardContent>
        </Card>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <CommunityFeed />
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
