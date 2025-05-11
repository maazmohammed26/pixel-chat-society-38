
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessagesList } from '@/components/messages/MessagesList';
import { MessageView } from '@/components/messages/MessageView';
import { MessageInput } from '@/components/messages/MessageInput';
import { useMessageNotifications } from '@/hooks/use-message-notifications';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: {
    name: string;
    avatar: string;
  };
}

export function Messages() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const { toast } = useToast();
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mobileView, setMobileView] = useState(window.innerWidth <= 640);
  const navigate = useNavigate();

  // Monitor network status and screen size
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => {
      setNetworkStatus('offline');
      toast({
        title: "You're offline",
        description: "Messages will be sent when you reconnect",
        variant: "destructive",
      });
    };
    
    const handleResize = () => {
      setMobileView(window.innerWidth <= 640);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', handleResize);
    
    // Update document title
    document.title = "SocialChat";

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', handleResize);
    };
  }, [toast]);

  // Use the notification hook
  useMessageNotifications(currentUser?.id, () => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
    } else {
      fetchFriends();
    }
  });

  const fetchFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, avatar')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        setCurrentUser({
          id: user.id,
          name: userProfile.name || 'User',
          avatar: userProfile.avatar || ''
        });
      }

      // Get friend relationships first
      const { data: friendsData, error } = await supabase
        .from('friends')
        .select('id, sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      if (error) {
        console.error("Error fetching friends for messages:", error);
        throw error;
      }
      
      // Format friends data
      const formattedFriends: Friend[] = [];
      
      // Process each relationship separately
      if (friendsData) {
        for (const friend of friendsData) {
          // Determine if the current user is the sender or receiver
          const isSender = friend.sender_id === user.id;
          const friendId = isSender ? friend.receiver_id : friend.sender_id;
          
          // Get the friend's profile details in a separate query
          const { data: friendProfile } = await supabase
            .from('profiles')
            .select('id, name, username, avatar')
            .eq('id', friendId)
            .single();
          
          if (friendProfile && friendProfile.id) {
            formattedFriends.push({
              id: friendProfile.id,
              name: friendProfile.name || 'User',
              username: friendProfile.username || 'guest',
              avatar: friendProfile.avatar || ''
            });
          }
        }
      }

      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends for messages:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load friends'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get messages between current user and selected friend
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          sender:profiles!messages_sender_id_fkey(name, avatar)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at');
        
      if (error) throw error;

      const formattedMessages: Message[] = messagesData.map((message: any) => ({
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: message.content,
        created_at: message.created_at,
        sender: {
          name: message.sender?.name || 'Unknown',
          avatar: message.sender?.avatar || ''
        }
      }));

      setMessages(formattedMessages);
      
      // Mark received messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', friendId)
        .eq('receiver_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load messages'
      });
    }
  };

  const sendMessage = async (content: string) => {
    if (!selectedFriend || !currentUser) return;
    
    try {
      setSendingMessage(true);
      
      // Store message in local storage if offline
      if (networkStatus === 'offline') {
        const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        pendingMessages.push({
          sender_id: currentUser.id,
          receiver_id: selectedFriend.id,
          content: content.trim(),
          created_at: new Date().toISOString()
        });
        localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
        
        // Add to current messages for UI update
        const offlineMessage = {
          id: `offline-${Date.now()}`,
          sender_id: currentUser.id,
          receiver_id: selectedFriend.id,
          content: content.trim(),
          created_at: new Date().toISOString(),
          sender: {
            name: currentUser.name,
            avatar: currentUser.avatar
          },
          pending: true
        };
        
        setMessages(prevMessages => [...prevMessages, offlineMessage as Message]);
        
        toast({
          title: "Message saved",
          description: "Will be sent when you're back online",
          variant: "default",
        });
        return;
      }
      
      // Insert new message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: selectedFriend.id,
          content: content.trim(),
          read: false
        })
        .select();
        
      if (error) throw error;

      // Manually add the message to the list for immediate feedback
      if (data && data[0]) {
        setMessages(prevMessages => [...prevMessages, {
          ...data[0],
          sender: {
            name: currentUser.name,
            avatar: currentUser.avatar
          }
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    fetchMessages(friend.id);
    
    // For mobile, we need to add a class to hide the sidebar
    if (mobileView) {
      document.querySelector('.friends-sidebar')?.classList.add('hidden');
      document.querySelector('.chat-container')?.classList.remove('hidden');
      document.querySelector('.chat-container')?.classList.add('w-full');
    }
  };
  
  const handleBackToFriends = () => {
    if (mobileView) {
      document.querySelector('.friends-sidebar')?.classList.remove('hidden');
      document.querySelector('.chat-container')?.classList.add('hidden');
    }
  };

  const deleteAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // First delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
        
      if (profileError) throw profileError;
      
      // Then delete the user account
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) throw authError;
      
      // Sign out the user
      await supabase.auth.signOut();
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted",
        variant: "default",
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete account. Please try again.'
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    // Only fetch friends once to prevent looping
    fetchFriends();
    
    // Set up realtime subscription for messages
    const channel = supabase
      .channel('messages-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        async (payload) => {
          const newMessage = payload.new as Message;
          
          if (
            selectedFriend && 
            ((newMessage.sender_id === selectedFriend.id && newMessage.receiver_id === currentUser?.id) || 
             (newMessage.sender_id === currentUser?.id && newMessage.receiver_id === selectedFriend.id))
          ) {
            // Fetch the sender details for the new message
            const { data } = await supabase
              .from('profiles')
              .select('name, avatar')
              .eq('id', newMessage.sender_id)
              .single();
              
            if (data) {
              setMessages(prevMessages => [...prevMessages, {
                ...newMessage,
                sender: {
                  name: data.name || 'Unknown',
                  avatar: data.avatar || ''
                }
              }]);
              
              // Mark message as read if we're the receiver
              if (newMessage.receiver_id === currentUser?.id) {
                await supabase
                  .from('messages')
                  .update({ read: true })
                  .eq('id', newMessage.id);
              }
            }
          }
        }
      )
      .subscribe();
      
    // Also subscribe to friends table changes
    const friendsChannel = supabase
      .channel('friends-status-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'friends' }, 
        () => {
          // Refresh friends list when there's any change in the friends table
          fetchFriends();
        }
      )
      .subscribe();

    // Try to send pending messages when back online
    if (networkStatus === 'online') {
      const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
      if (pendingMessages.length > 0) {
        const sendPendingMessages = async () => {
          for (const msg of pendingMessages) {
            try {
              await supabase.from('messages').insert({
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                content: msg.content,
                read: false
              });
            } catch (error) {
              console.error('Failed to send pending message:', error);
            }
          }
          localStorage.removeItem('pendingMessages');
          if (selectedFriend) {
            fetchMessages(selectedFriend.id);
          }
        };
        sendPendingMessages();
      }
    }

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(friendsChannel);
    };
  }, [selectedFriend, currentUser, networkStatus]);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
    }
  }, [selectedFriend]);

  return (
    <DashboardLayout>
      <Card className="h-[calc(100vh-180px)] md:h-[calc(100vh-130px)] flex flex-col card-gradient">
        <CardHeader className="pb-2 font-pixelated">
          <CardTitle className="text-2xl font-pixelated flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Messages
          </CardTitle>
          <CardDescription>
            Chat with your friends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex gap-4 overflow-hidden p-0">
          {/* Friends list */}
          <div className={`friends-sidebar w-full md:w-1/4 border-r overflow-y-auto ${mobileView && selectedFriend ? 'hidden' : ''}`}>
            <MessagesList
              friends={friends}
              loading={loading}
              selectedFriend={selectedFriend}
              onSelectFriend={handleSelectFriend}
              onDeleteAccount={() => setDeleteDialogOpen(true)}
            />
          </div>
          
          {/* Chat area */}
          <div className={`chat-container flex-1 flex flex-col overflow-hidden ${mobileView && !selectedFriend ? 'hidden' : ''}`}>
            <MessageView
              messages={messages}
              selectedFriend={selectedFriend}
              currentUser={currentUser}
              mobileView={mobileView}
              onBackToFriends={handleBackToFriends}
            />
            
            {selectedFriend && (
              <MessageInput
                onSendMessage={sendMessage}
                networkStatus={networkStatus}
                sendingMessage={sendingMessage}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Delete Your Account?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteAccount}
              className="font-pixelated"
            >
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default Messages;
