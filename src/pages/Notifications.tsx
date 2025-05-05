
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, MessageSquare, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

// This will be implemented in the future to show real notifications
// For now, we'll show a placeholder UI with example notifications
const notifications = [
  {
    id: '1',
    type: 'friend_request',
    content: 'sent you a friend request',
    read: false,
    timestamp: '5m ago',
    user: {
      name: 'Sarah Wilson',
      username: 'sarahw',
      avatar: 'https://i.pravatar.cc/150?u=sarahw'
    }
  },
  {
    id: '2',
    type: 'like',
    content: 'liked your post',
    read: true,
    timestamp: '2h ago',
    user: {
      name: 'Michael Brown',
      username: 'mikebrown',
      avatar: 'https://i.pravatar.cc/150?u=mikebrown'
    }
  },
  {
    id: '3',
    type: 'comment',
    content: 'commented on your post: "Great idea, let\'s connect!"',
    read: true,
    timestamp: '1d ago',
    user: {
      name: 'Alex Johnson',
      username: 'alexj',
      avatar: 'https://i.pravatar.cc/150?u=alexj'
    }
  }
];

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
        <CardContent className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`flex items-start p-3 rounded-lg border ${!notification.read ? 'bg-muted/30' : ''}`}
              >
                <Avatar className="mr-3 mt-1">
                  <AvatarImage src={notification.user.avatar} alt={notification.user.name} />
                  <AvatarFallback>{notification.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p>
                      <span className="font-medium">{notification.user.name}</span>
                      {' '}{notification.content}
                    </p>
                    <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                  </div>
                  {notification.type === 'friend_request' && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="default" className="bg-social-blue hover:bg-social-blue/90">
                        Accept
                      </Button>
                      <Button size="sm" variant="outline">
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
                {notification.type === 'friend_request' && (
                  <UserPlus className="h-4 w-4 text-social-blue ml-2 mt-1 flex-shrink-0" />
                )}
                {notification.type === 'like' && (
                  <Heart className="h-4 w-4 text-social-magenta ml-2 mt-1 flex-shrink-0" />
                )}
                {notification.type === 'comment' && (
                  <MessageSquare className="h-4 w-4 text-social-green ml-2 mt-1 flex-shrink-0" />
                )}
              </div>
            ))
          ) : (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">You don't have any notifications yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Notifications;
