
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Notifications() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold social-gradient bg-clip-text text-transparent">Notifications</CardTitle>
          <CardDescription>
            Stay updated with activity related to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">You don't have any notifications yet.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Notifications;
