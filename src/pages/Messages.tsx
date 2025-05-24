
import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, User, ArrowLeft, Phone, Video } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
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
  const [mobileView, setMobileView] = useState(window.innerWidth <= 640);

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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', handleResize);
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

      // Get friend relationships
      const { data: friendsData, error } = await supabase
        .from('friends')
        .select('id, sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      if (error) {
        console.error("Error fetching friends for messages:", error);
        throw error;
      }
      
      const formattedFriends: Friend[] = [];
      
      if (friendsData) {
        for (const friend of friendsData) {
          const isSender = friend.sender_id === user.id;
          const friendId = isSender ? friend.receiver_id : friend.sender_id;
          
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
      
      if (networkStatus === 'offline') {
        const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        pendingMessages.push({
          sender_id: currentUser.id,
          receiver_id: selectedFriend.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString()
        });
        localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
        
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
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    fetchMessages(friend.id);
    
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

  useEffect(() => {
    fetchFriends();
    
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
              
              if (newMessage.receiver_id === currentUser?.id) {
                await supabase
                  .from('messages')
                  .update({ read: true })
                  .eq('id', newMessage.id);
              }
            }
          } else if (newMessage.receiver_id === currentUser?.id) {
            fetchFriends();
            
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newMessage.sender_id)
              .single();
              
            if (senderData) {
              if (Notification.permission === 'granted') {
                const notification = new Notification(`New message from ${senderData.name}`, {
                  body: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
                  icon: '/favicon.ico'
                });
                
                notification.onclick = () => {
                  window.focus();
                  const friend = friends.find(f => f.id === newMessage.sender_id);
                  if (friend) {
                    setSelectedFriend(friend);
                    fetchMessages(friend.id);
                  }
                };
              }
              
              toast({
                title: `New message from ${senderData.name}`,
                description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
                className: 'bg-primary text-white font-pixelated',
              });
            }
          }
        }
      )
      .subscribe();
      
    const friendsChannel = supabase
      .channel('friends-status-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'friends' }, 
        () => {
          fetchFriends();
        }
      )
      .subscribe();

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

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

  return (
    <DashboardLayout>
      <Card className="h-[calc(100vh-120px)] flex flex-col card-gradient">
        <CardHeader className="pb-2 font-pixelated">
          <CardTitle className="text-lg font-pixelated flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Messages
          </CardTitle>
          <CardDescription className="font-pixelated text-xs">
            Chat with your friends
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex gap-4 overflow-hidden p-0">
          {/* Friends list */}
          <div className={`friends-sidebar w-full md:w-1/3 border-r p-3 overflow-hidden ${mobileView && selectedFriend ? 'hidden' : ''}`}>
            <h3 className="font-pixelated mb-3 flex items-center gap-2 text-sm">
              <User className="h-4 w-4" /> Contacts
            </h3>
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-24 mt-1" />
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
                          ? 'bg-primary text-white' 
                          : 'hover:bg-muted/50'
                      } pixel-border pixel-shadow`}
                      onClick={() => handleSelectFriend(friend)}
                    >
                      <Avatar className="h-8 w-8">
                        {friend.avatar ? (
                          <AvatarImage src={friend.avatar} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                            {friend.name ? friend.name.substring(0, 2).toUpperCase() : 'UN'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-pixelated text-xs">{friend.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username || 'guest'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4 font-pixelated text-xs">No friends yet</p>
                  <p className="text-xs mt-1">Add friends to start chatting</p>
                  <Button variant="outline" className="mt-4 bg-primary text-white hover:bg-primary/90 font-pixelated text-xs" asChild>
                    <a href="/friends">Find Friends</a>
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Chat area */}
          <div className={`chat-container flex-1 flex flex-col overflow-hidden ${mobileView && !selectedFriend ? 'hidden' : ''}`}>
            {selectedFriend ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mobileView && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleBackToFriends}
                        className="mr-2 h-8 w-8"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Avatar className="h-8 w-8">
                      {selectedFriend.avatar ? (
                        <AvatarImage src={selectedFriend.avatar} />
                      ) : (
                        <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                          {selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : 'UN'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-pixelated text-sm">{selectedFriend.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">@{selectedFriend.username || 'guest'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-primary relative h-8 w-8"
                      disabled
                    >
                      <Phone className="h-4 w-4" />
                      <Badge className="absolute -top-1 -right-1 px-1 text-[8px] h-3 pointer-events-none font-pixelated" variant="outline">
                        Soon
                      </Badge>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-primary relative h-8 w-8"
                      disabled
                    >
                      <Video className="h-4 w-4" />
                      <Badge className="absolute -top-1 -right-1 px-1 text-[8px] h-3 pointer-events-none font-pixelated" variant="outline">
                        Soon
                      </Badge>
                    </Button>
                  </div>
                </div>
                
                {/* Messages */}
                <ScrollArea className="flex-1 p-3 bg-muted/20">
                  {messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                          <div className={`flex gap-2 max-w-[80%] ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="h-6 w-6">
                              {message.sender?.avatar ? (
                                <AvatarImage src={message.sender.avatar} />
                              ) : (
                                <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                                  {message.sender?.name ? message.sender.name.substring(0, 2).toUpperCase() : 'UN'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className={`${message.sender_id === currentUser?.id ? 'message-bubble-sent' : 'message-bubble-received'} ${(message as any).pending ? 'opacity-70' : ''} font-pixelated text-xs`}>
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
                      <p className="text-muted-foreground font-pixelated text-xs">Start the conversation!</p>
                    </div>
                  )}
                </ScrollArea>
                
                {/* Message input */}
                <div className="p-3 border-t">
                  {networkStatus === 'offline' && (
                    <Alert className="mb-2 bg-amber-50 text-amber-800 border-amber-200">
                      <AlertDescription className="flex items-center font-pixelated text-xs">
                        <div className="h-2 w-2 bg-amber-500 rounded-full mr-2"></div>
                        You're offline. Messages will be sent when you reconnect.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type a message..." 
                      className="flex-1 min-h-[50px] max-h-[100px] focus-visible:ring-primary font-pixelated text-xs resize-none"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendingMessage}
                    />
                    <Button 
                      className="self-end bg-primary hover:bg-primary/90 text-white font-pixelated h-[50px] w-[50px] p-0"
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
                <MessageSquare className="h-12 w-12 text-primary mb-4" />
                <h1 className="text-lg font-pixelated mb-2">Pixel Chat</h1>
                <p className="text-muted-foreground mb-6 max-w-md font-pixelated text-xs">
                  Select a friend to start chatting
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Messages;
