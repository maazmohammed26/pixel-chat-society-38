import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, MessageSquare, Heart, Bell, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NotificationProps {
  id: string;
  type: 'friend_request' | 'like' | 'comment' | 'message';
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
  post_content?: string;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUser(profile);
    }
    return user;
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      
      if (!user) return;

      // Get friend requests
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
      
      // Get user's posts for likes and comments
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id, content')
        .eq('user_id', user.id);
      
      const postIds = myPosts?.map(post => post.id) || [];
      
      let likeNotifications: any[] = [];
      let commentNotifications: any[] = [];
      
      if (postIds.length > 0) {
        // Get likes on user's posts
        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select(`
            id,
            created_at,
            post_id,
            profiles!likes_user_id_fkey(id, name, username, avatar),
            posts!likes_post_id_fkey(content)
          `)
          .in('post_id', postIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (likesError) throw likesError;
        
        likeNotifications = likes?.map(like => ({
          id: `like_${like.id}`,
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
          reference_id: like.post_id,
          post_content: like.posts?.content?.substring(0, 50) + (like.posts?.content?.length > 50 ? '...' : '')
        })) || [];

        // Get comments on user's posts
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id,
            created_at,
            post_id,
            content,
            profiles!comments_user_id_fkey(id, name, username, avatar),
            posts!comments_post_id_fkey(content)
          `)
          .in('post_id', postIds)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (commentsError) throw commentsError;
        
        commentNotifications = comments?.map(comment => ({
          id: `comment_${comment.id}`,
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
          reference_id: comment.post_id,
          post_content: comment.posts?.content?.substring(0, 50) + (comment.posts?.content?.length > 50 ? '...' : '')
        })) || [];
      }

      // Get recent messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          created_at,
          content,
          read,
          profiles!messages_sender_id_fkey(id, name, username, avatar)
        `)
        .eq('receiver_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (messagesError) throw messagesError;

      const messageNotifications = messages?.map(message => ({
        id: `message_${message.id}`,
        type: 'message' as const,
        content: 'sent you a message',
        read: message.read,
        created_at: message.created_at,
        sender: {
          id: message.profiles.id,
          name: message.profiles.name || 'User',
          username: message.profiles.username || 'guest',
          avatar: message.profiles.avatar || ''
        },
        reference_id: message.id,
        post_content: message.content?.substring(0, 50) + (message.content?.length > 50 ? '...' : '')
      })) || [];

      // Format friend requests
      const formattedFriendRequests = friendRequests?.map(request => ({
        id: `friend_${request.id}`,
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
      })) || [];

      // Combine and sort all notifications
      const allNotifications = [
        ...formattedFriendRequests,
        ...likeNotifications,
        ...commentNotifications,
        ...messageNotifications
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications);
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
  }, [getCurrentUser, toast]);

  const handleAcceptFriend = async (notificationId: string) => {
    try {
      const friendId = notificationId.replace('friend_', '');
      await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendId);
      
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
      const friendId = notificationId.replace('friend_', '');
      await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);
      
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

  const handleClearAll = async () => {
    try {
      if (!currentUser) return;

      // Mark messages as read
      const messageIds = notifications
        .filter(n => n.type === 'message')
        .map(n => n.reference_id);

      if (messageIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', messageIds);
      }

      setNotifications([]);
      setShowClearConfirm(false);
      
      toast({
        title: 'Notifications cleared',
        description: 'All notifications have been cleared'
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear notifications'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-social-dark-green" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-social-green" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-social-blue" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime')
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
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Card className="card-gradient">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold social-gradient bg-clip-text text-transparent flex items-center gap-2 font-pixelated">
                  <Bell className="h-6 w-6" /> 
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="font-pixelated text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="font-pixelated text-xs">
                  Stay updated with activity related to your account.
                </CardDescription>
              </div>
              {notifications.length > 0 && (
                <Button
                  onClick={() => setShowClearConfirm(true)}
                  variant="outline"
                  size="sm"
                  className="font-pixelated text-xs flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground"
                  disabled={loading}
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </Button>
              )}
            </div>
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
                  className={`flex items-start p-4 rounded-lg border animate-fade-in transition-all duration-200 hover:bg-accent/10 ${
                    !notification.read ? 'bg-accent/5 border-social-green/20' : 'border-border'
                  }`}
                >
                  <Avatar className="mr-3 mt-1">
                    {notification.sender.avatar ? (
                      <AvatarImage src={notification.sender.avatar} alt={notification.sender.name} />
                    ) : (
                      <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                        {notification.sender.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-pixelated text-xs">
                        <span className="font-medium">{notification.sender.name}</span>
                        {' '}{notification.content}
                        {notification.post_content && (
                          <span className="text-muted-foreground">: "{notification.post_content}"</span>
                        )}
                      </p>
                      <span className="font-pixelated text-xs text-muted-foreground mt-1 sm:mt-0" title={format(new Date(notification.created_at), 'PPpp')}>
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="font-pixelated text-xs text-muted-foreground mt-1">@{notification.sender.username}</p>
                    {notification.type === 'friend_request' && (
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          className="bg-social-dark-green hover:bg-social-forest-green text-white font-pixelated text-xs h-6" 
                          onClick={() => handleAcceptFriend(notification.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="font-pixelated text-xs h-6"
                          onClick={() => handleDeclineFriend(notification.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="ml-2 mt-1 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center rounded-lg border border-dashed">
                <Bell className="w-12 h-12 text-muted-foreground opacity-40 mx-auto mb-4" />
                <p className="font-pixelated text-sm text-muted-foreground">You don't have any notifications yet.</p>
                <p className="font-pixelated text-xs mt-2 text-muted-foreground">Activity related to your account will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clear All Confirmation Dialog */}
        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <AlertDialogContent className="animate-in zoom-in-95 duration-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-pixelated">Clear All Notifications</AlertDialogTitle>
              <AlertDialogDescription className="font-pixelated">
                Are you sure you want to clear all notifications? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-pixelated">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleClearAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated"
              >
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

export default Notifications;