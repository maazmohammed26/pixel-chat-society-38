
import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, MessageSquare, Heart, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface NotificationProps {
  id: string;
  type: 'friend_request' | 'like' | 'comment';
  content: string;
  read: boolean;
  created_at: string;
  sender: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  reference_id?: string;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get friend requests with explicit field selections
      const { data: friendRequests, error: friendError } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          profiles!friends_sender_id_fkey(id, name, username, avatar)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (friendError) throw friendError;
      
      // Get likes on my posts
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id);
      
      const postIds = myPosts?.map(post => post.id) || [];
      
      let likeNotifications: any[] = [];
      if (postIds.length > 0) {
        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select(`
            id,
            created_at,
            post_id,
            profiles!likes_user_id_fkey(id, name, username, avatar)
          `)
          .in('post_id', postIds)
          .neq('user_id', user.id) // Don't include self-likes
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (likesError) throw likesError;
        
        likeNotifications = likes?.map(like => ({
          id: like.id,
          type: 'like' as const,
          content: 'liked your post',
          read: false,
          created_at: like.created_at,
          sender: {
            id: like.profiles.id,
            name: like.profiles.name || 'User',
            username: like.profiles.username || 'guest',
            avatar: like.profiles.avatar || ''
          },
          reference_id: like.post_id
        })) || [];
      }
      
      // Get comments on my posts
      let commentNotifications: any[] = [];
      if (postIds.length > 0) {
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            created_at,
            post_id,
            profiles!comments_user_id_fkey(id, name, username, avatar)
          `)
          .in('post_id', postIds)
          .neq('user_id', user.id) // Don't include self-comments
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (commentsError) throw commentsError;
        
        commentNotifications = comments?.map(comment => ({
          id: comment.id,
          type: 'comment' as const,
          content: 'commented on your post',
          read: false,
          created_at: comment.created_at,
          sender: {
            id: comment.profiles.id,
            name: comment.profiles.name || 'User',
            username: comment.profiles.username || 'guest',
            avatar: comment.profiles.avatar || ''
          },
          reference_id: comment.post_id
        })) || [];
      }

      // Format friend requests
      const formattedFriendRequests = friendRequests?.map(request => {
        return {
          id: request.id,
          type: 'friend_request' as const,
          content: 'sent you a friend request',
          read: false,
          created_at: request.created_at,
          sender: {
            id: request.profiles.id || 'unknown',
            name: request.profiles.name || 'User',
            username: request.profiles.username || 'guest',
            avatar: request.profiles.avatar || ''
          },
          reference_id: request.id
        };
      }) || [];

      // Combine all notifications
      const formattedNotifications = [
        ...formattedFriendRequests,
        ...likeNotifications,
        ...commentNotifications
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load notifications'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriend = async (notificationId: string) => {
    try {
      await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', notificationId);
      
      toast({
        title: 'Friend request accepted',
        description: 'You are now friends!'
      });
      
      fetchNotifications();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept friend request'
      });
    }
  };

  const handleDeclineFriend = async (notificationId: string) => {
    try {
      await supabase
        .from('friends')
        .delete()
        .eq('id', notificationId);
      
      toast({
        title: 'Friend request declined',
        description: 'You have declined the friend request'
      });
      
      fetchNotifications();
    } catch (error) {
      console.error('Error declining friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to decline friend request'
      });
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up realtime subscription for notifications
    const channel = supabase
      .channel('notification-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'friends' }, 
        () => fetchNotifications()
      )
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'likes' }, 
        () => fetchNotifications()
      )
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'comments' }, 
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <DashboardLayout>
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-2xl font-bold social-gradient bg-clip-text text-transparent flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
          </CardTitle>
          <CardDescription>
            Stay updated with activity related to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start p-3 rounded-lg border animate-pulse-green">
                  <div className="h-10 w-10 rounded-full bg-muted mr-3"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`flex items-start p-4 rounded-lg border animate-fade-in ${!notification.read ? 'bg-accent/5' : ''} hover:bg-accent/10 transition-colors`}
              >
                <Avatar className="mr-3 mt-1">
                  {notification.sender.avatar ? (
                    <AvatarImage src={notification.sender.avatar} alt={notification.sender.name} />
                  ) : (
                    <AvatarFallback className="bg-social-dark-green text-white">
                      {notification.sender.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium">
                      <span className="font-medium">{notification.sender.name}</span>
                      {' '}{notification.content}
                    </p>
                    <span className="text-xs text-muted-foreground mt-1 sm:mt-0" title={format(new Date(notification.created_at), 'PPpp')}>
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">@{notification.sender.username}</p>
                  {notification.type === 'friend_request' && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="bg-social-dark-green hover:bg-social-forest-green text-white" onClick={() => handleAcceptFriend(notification.reference_id!)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeclineFriend(notification.reference_id!)}>
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
                {notification.type === 'friend_request' && (
                  <UserPlus className="h-4 w-4 text-social-dark-green ml-2 mt-1 flex-shrink-0" />
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
            <div className="py-10 text-center rounded-lg border border-dashed">
              <Bell className="w-12 h-12 text-muted-foreground opacity-40 mx-auto mb-4" />
              <p className="text-muted-foreground">You don't have any notifications yet.</p>
              <p className="text-sm mt-2">Activity related to your account will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Notifications;
