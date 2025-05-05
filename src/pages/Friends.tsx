
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { FriendList } from '@/components/dashboard/FriendList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Friends() {
  return (
    <DashboardLayout>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold social-gradient bg-clip-text text-transparent">Friends & Connections</CardTitle>
          <CardDescription>
            Manage your network, send requests, and create group chats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Building your network is easy! Send requests to suggested users or search for friends.</p>
        </CardContent>
      </Card>
      
      <FriendList />
    </DashboardLayout>
  );
}

export default Friends;
