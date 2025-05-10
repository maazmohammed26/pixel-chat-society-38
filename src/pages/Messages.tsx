
import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  online?: boolean;
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
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');

  // Monitor network status
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

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

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

      // Fixed query for accepted friends
      const { data: friendsData, error } = await supabase
        .from('friends')
        .select(`
          id,
          sender_id, receiver_id,
          profiles!friends_sender_id_fkey(id, name, username, avatar),
          profiles!friends_receiver_id_fkey(id, name, username, avatar)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      if (error) {
        console.error("Error fetching friends for messages:", error);
        throw error;
      }
      
      // Format friends data with corrected foreign key references
      const formattedFriends: Friend[] = [];
      
      friendsData?.forEach(friend => {
        // Determine if the current user is the sender or receiver
        const isSender = friend.sender_id === user.id;
        const friendProfile = isSender 
          ? friend.profiles.filter((p: any) => p.id === friend.receiver_id)[0]
          : friend.profiles.filter((p: any) => p.id === friend.sender_id)[0];
        
        if (friendProfile && friendProfile.id) {
          formattedFriends.push({
            id: friendProfile.id,
            name: friendProfile.name || 'User',
            username: friendProfile.username || 'guest',
            avatar: friendProfile.avatar || '',
            online: Math.random() > 0.5 // Random online status for demo
          });
        }
      });

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
          profiles!messages_sender_id_fkey(name, avatar)
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
          name: message.profiles?.name || 'Unknown',
          avatar: message.profiles?.avatar || ''
        }
      }));

      setMessages(formattedMessages);
      scrollToBottom();
      
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !currentUser) return;
    
    try {
      setSendingMessage(true);
      
      // Store message in local storage if offline
      if (networkStatus === 'offline') {
        const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        pendingMessages.push({
          sender_id: currentUser.id,
          receiver_id: selectedFriend.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString()
        });
        localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
        
        // Add to current messages for UI update
        const offlineMessage = {
          id: `offline-${Date.now()}`,
          sender_id: currentUser.id,
          receiver_id: selectedFriend.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
          sender: {
            name: currentUser.name,
            avatar: currentUser.avatar
          },
          pending: true
        };
        
        setMessages(prevMessages => [...prevMessages, offlineMessage as Message]);
        setNewMessage('');
        scrollToBottom();
        
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
          content: newMessage.trim(),
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
      
      setNewMessage('');
      scrollToBottom();
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
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
              scrollToBottom();
              
              // Mark message as read if we're the receiver
              if (newMessage.receiver_id === currentUser?.id) {
                await supabase
                  .from('messages')
                  .update({ read: true })
                  .eq('id', newMessage.id);
              }
            }
          } else if (newMessage.receiver_id === currentUser?.id) {
            // If we received a message from someone else, refresh friends list
            // to update unread counts
            fetchFriends();
            
            // Show notification
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newMessage.sender_id)
              .single();
              
            if (senderData) {
              toast({
                title: `New message from ${senderData.name}`,
                description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
                className: 'bg-social-dark-green text-white',
              });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Welcome message component
  const WelcomeMessage = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
      <MessageSquare className="h-16 w-16 text-social-dark-green mb-4" />
      <h1 className="text-2xl font-bold mb-2">Welcome to SocialChat!</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        This application is developed by Mohammed Maaz A. It's currently under development 
        and serves as a small demo of real-time chat capabilities.
      </p>
      <p className="text-social-dark-green font-medium">
        Enjoy exploring the features and thank you for checking out this project!
      </p>
      <div className="mt-8">
        <p className="text-sm text-muted-foreground">Select a friend from the list to start chatting</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <Card className="h-[calc(100vh-180px)] md:h-[calc(100vh-130px)] flex flex-col card-gradient">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold social-gradient bg-clip-text text-transparent flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Messages
          </CardTitle>
          <CardDescription>
            Your conversations with friends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex gap-4 overflow-hidden p-0">
          {/* Friends list */}
          <div className="w-1/3 md:w-1/4 border-r p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4" /> Contacts
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-32 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friends.length > 0 ? (
              <div className="space-y-1">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedFriend?.id === friend.id 
                        ? 'bg-social-dark-green text-white' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedFriend(friend)}
                  >
                    <div className="relative">
                      <Avatar>
                        {friend.avatar ? (
                          <AvatarImage src={friend.avatar} />
                        ) : (
                          <AvatarFallback className="bg-social-dark-green text-white">
                            {friend.name ? friend.name.substring(0, 2).toUpperCase() : 'UN'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {friend.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{friend.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">@{friend.username || 'guest'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No friends yet</p>
                <p className="text-sm mt-1">Add friends to start chatting</p>
                <Button variant="outline" className="mt-4 bg-social-dark-green text-white hover:bg-social-forest-green" asChild>
                  <a href="/friends">Find Friends</a>
                </Button>
              </div>
            )}
          </div>
          
          {/* Chat area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedFriend ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      {selectedFriend.avatar ? (
                        <AvatarImage src={selectedFriend.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white">
                          {selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : 'UN'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {selectedFriend.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{selectedFriend.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">
                      @{selectedFriend.username || 'guest'} · 
                      {selectedFriend.online ? (
                        <span className="text-green-500 ml-1">Online</span>
                      ) : (
                        <span className="text-muted-foreground ml-1">Offline</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
                  {messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                          <div className={`flex gap-2 max-w-[80%] ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="h-8 w-8">
                              {message.sender?.avatar ? (
                                <AvatarImage src={message.sender.avatar} />
                              ) : (
                                <AvatarFallback className="bg-social-dark-green text-white">
                                  {message.sender?.name ? message.sender.name.substring(0, 2).toUpperCase() : 'UN'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className={`${message.sender_id === currentUser?.id ? 'message-bubble-sent' : 'message-bubble-received'} ${(message as any).pending ? 'opacity-70' : ''}`}>
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs opacity-70">
                                  {format(new Date(message.created_at), 'HH:mm')}
                                </p>
                                {(message as any).pending && (
                                  <span className="text-xs ml-2">Pending...</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </div>
                
                {/* Message input */}
                <div className="p-4 border-t">
                  {networkStatus === 'offline' && (
                    <div className="bg-amber-50 text-amber-800 text-sm rounded-md p-2 mb-2 flex items-center">
                      <div className="h-2 w-2 bg-amber-500 rounded-full mr-2"></div>
                      You're offline. Messages will be sent when you reconnect.
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type a message..." 
                      className="flex-1 min-h-[60px] max-h-[120px] focus-visible:ring-social-dark-green"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendingMessage}
                    />
                    <Button 
                      className="self-end bg-social-dark-green hover:bg-social-forest-green text-white"
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <WelcomeMessage />
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Messages;
