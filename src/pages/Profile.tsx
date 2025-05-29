
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import UserProfile from '@/components/dashboard/UserProfile';

export function Profile() {
  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <UserProfile />
      </div>
    </DashboardLayout>
  );
}

export default Profile;
