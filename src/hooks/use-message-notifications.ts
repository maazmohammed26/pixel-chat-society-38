
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useMessageNotifications(currentUserId: string | undefined, onNewMessage: () => void) {
  useEffect(() => {
    if (!currentUserId) return;
    
    // Set up realtime subscription for messages
    const channel = supabase
      .channel('messages-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        async (payload) => {
          const newMessage = payload.new as any;
          
          if (newMessage.receiver_id === currentUserId) {
            // Fetch the sender details for the new message
            const { data } = await supabase
              .from('profiles')
              .select('name, avatar')
              .eq('id', newMessage.sender_id)
              .single();

            if (data) {
              // Show browser notification
              if (Notification.permission === 'granted') {
                const notification = new Notification(`New message from ${data.name}`, {
                  body: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
                  icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png'
                });
                
                notification.onclick = () => {
                  window.focus();
                };
              }
              
              // Show toast notification
              toast({
                title: `New message from ${data.name}`,
                description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
                className: 'bg-primary text-white font-pixelated',
              });

              // Call the callback to update UI
              onNewMessage();
            }
          }
        }
      )
      .subscribe();
      
    // Request notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, onNewMessage]);
}
