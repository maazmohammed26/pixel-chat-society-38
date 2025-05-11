
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useNotifications() {
  const [isGranted, setIsGranted] = useState(false);

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
  }, []);

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (isGranted && 'Notification' in window) {
      return new Notification(title, options);
    }
    return null;
  };

  const setupMessageNotifications = (userId: string) => {
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
                icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png'
              });
            }
          } catch (error) {
            console.error('Error sending notification:', error);
          }
        }
      )
      .subscribe();
  };

  return { isGranted, sendNotification, setupMessageNotifications };
}
