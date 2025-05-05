
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Messages() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold social-gradient bg-clip-text text-transparent">Messages</CardTitle>
          <CardDescription>
            Your private conversations and group chats.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground mb-4">Messages feature coming soon!</p>
          <p>Connect with friends first to start private conversations.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Messages;
