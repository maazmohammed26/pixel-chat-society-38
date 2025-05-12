
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const [isGranted, setIsGranted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      // Check if permission is already granted
      if (Notification.permission === 'granted') {
        setIsGranted(true);
      } else if (Notification.permission !== 'denied') {
        // Request permission
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setIsGranted(true);
          }
        });
      }
    }

    // Check for service worker support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Register service worker for push notifications
        navigator.serviceWorker.ready.then(registration => {
          console.log('Service Worker is ready for push notifications');
        });
      } catch (error) {
        console.error('Error setting up service worker:', error);
      }
    }
  }, []);

  // Send a notification with proper fallbacks
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    // First try to show a notification via the Notifications API
    if (isGranted && 'Notification' in window) {
      try {
        const notification = new Notification(title, options);
        
        // Add click handler to notification
        notification.onclick = function() {
          window.focus();
          notification.close();
        };
        
        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
    
    // If native notification fails or isn't available, use toast as fallback
    toast({
      title,
      description: options?.body,
      className: 'toast-notification',
    });
    
    return null;
  }, [isGranted, toast]);

  // Setup message notifications subscription
  const setupMessageNotifications = useCallback((userId: string) => {
    return supabase
      .channel('messages-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        }, 
        async (payload) => {
          try {
            // Get sender details
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single();

            if (senderData) {
              sendNotification(`New message from ${senderData.name}`, {
                body: payload.new.content.substring(0, 60) + (payload.new.content.length > 60 ? '...' : ''),
                icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                tag: 'message',
                renotify: true,
                requireInteraction: true,
              });
            }
          } catch (error) {
            console.error('Error sending notification:', error);
          }
        }
      )
      .subscribe();
  }, [sendNotification]);

  // Setup for friend request notifications
  const setupFriendRequestNotifications = useCallback((userId: string) => {
    return supabase
      .channel('friend-request-notifications')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friends',
          filter: `receiver_id=eq.${userId} AND status=eq.pending`
        },
        async (payload) => {
          try {
            // Get sender details
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single();

            if (senderData) {
              sendNotification(`New Friend Request`, {
                body: `${senderData.name} sent you a friend request`,
                icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                tag: 'friend-request',
                renotify: true
              });
            }
          } catch (error) {
            console.error('Error sending friend request notification:', error);
          }
        }
      )
      .subscribe();
  }, [sendNotification]);

  // Setup for post notifications
  const setupPostNotifications = useCallback((userId: string) => {
    return supabase
      .channel('post-notifications')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          try {
            // Don't notify for user's own posts
            if (payload.new.user_id === userId) return;
            
            // Check if the poster is a friend
            const { count } = await supabase
              .from('friends')
              .select('*', { count: 'exact', head: true })
              .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
              .or(`sender_id.eq.${payload.new.user_id},receiver_id.eq.${payload.new.user_id}`)
              .eq('status', 'accepted');
              
            if (count && count > 0) {
              // Get poster details
              const { data: posterData } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.user_id)
                .single();

              if (posterData) {
                const postContent = payload.new.content || '';
                sendNotification(`New Post from ${posterData.name}`, {
                  body: postContent.substring(0, 60) + (postContent.length > 60 ? '...' : ''),
                  icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
                  tag: 'new-post',
                });
              }
            }
          } catch (error) {
            console.error('Error sending post notification:', error);
          }
        }
      )
      .subscribe();
  }, [sendNotification]);

  // Setup all notifications at once
  const setupAllNotifications = useCallback((userId: string) => {
    const messageChannel = setupMessageNotifications(userId);
    const friendRequestChannel = setupFriendRequestNotifications(userId);
    const postChannel = setupPostNotifications(userId);
    
    // Return a cleanup function
    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(friendRequestChannel);
      supabase.removeChannel(postChannel);
    };
  }, [setupMessageNotifications, setupFriendRequestNotifications, setupPostNotifications]);

  return { 
    isGranted, 
    sendNotification, 
    setupMessageNotifications,
    setupFriendRequestNotifications,
    setupPostNotifications,
    setupAllNotifications
  };
}
