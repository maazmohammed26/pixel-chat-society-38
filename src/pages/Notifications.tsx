
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

      // Get friend requests
      const { data: friendRequests, error: friendError } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          sender:sender_id (id, name, username, avatar)
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
            liker:user_id (id, name, username, avatar)
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
            id: like.liker.id,
            name: like.liker.name,
            username: like.liker.username,
            avatar: like.liker.avatar,
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
            commenter:user_id (id, name, username, avatar)
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
            id: comment.commenter.id,
            name: comment.commenter.name,
            username: comment.commenter.username,
            avatar: comment.commenter.avatar,
          },
          reference_id: comment.post_id
        })) || [];
      }

      // Format all notifications
      const formattedNotifications = [
        ...(friendRequests?.map(request => ({
          id: request.id,
          type: 'friend_request' as const,
          content: 'sent you a friend request',
          read: false,
          created_at: request.created_at,
          sender: {
            id: request.sender.id,
            name: request.sender.name,
            username: request.sender.username,
            avatar: request.sender.avatar,
          },
          reference_id: request.id
        })) || []),
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
      <Card>
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
                <div key={i} className="flex items-start p-3 rounded-lg border animate-pulse">
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
                className={`flex items-start p-3 rounded-lg border ${!notification.read ? 'bg-muted/30' : ''}`}
              >
                <Avatar className="mr-3 mt-1">
                  <AvatarImage src={notification.sender.avatar} alt={notification.sender.name} />
                  <AvatarFallback>{notification.sender.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p>
                      <span className="font-medium">{notification.sender.name}</span>
                      {' '}{notification.content}
                    </p>
                    <span className="text-xs text-muted-foreground" title={format(new Date(notification.created_at), 'PPpp')}>
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {notification.type === 'friend_request' && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="default" className="bg-social-blue hover:bg-social-blue/90" onClick={() => handleAcceptFriend(notification.reference_id!)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeclineFriend(notification.reference_id!)}>
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
