
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Settings() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold social-gradient bg-clip-text text-transparent">Settings</CardTitle>
          <CardDescription>
            Manage your account preferences and privacy settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground mb-4">Settings feature coming soon!</p>
          <p>In the future, you'll be able to customize your experience.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Settings;
