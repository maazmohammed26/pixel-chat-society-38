import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, User, X, ArrowLeft, Trash, Video, Phone, Volume2, VolumeX } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mobileView, setMobileView] = useState(window.innerWidth <= 640);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [showCallDialog, setShowCallDialog] = useState(false);
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
  
  // Handle enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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

  const startVideoCall = async () => {
    try {
      if (!selectedFriend) return;
      setShowCallDialog(true);
      
      // Get user media (camera and microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      // Display local video stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setCallStatus('calling');
      
      // In a real implementation, we would initiate WebRTC connection here
      // For this demo, we'll simulate the connection after a delay
      
      setTimeout(() => {
        // Simulate connecting
        setCallStatus('connected');
        
        // In a real app, this would be the remote stream from WebRTC
        if (remoteVideoRef.current) {
          // For demo purposes, we'll just display our own stream
          // In a real app, this would be replaced with the peer connection's remote stream
          remoteVideoRef.current.srcObject = stream;
        }
      }, 2000);
      
      toast({
        title: "Video call started",
        description: `Calling ${selectedFriend.name}...`,
      });
      
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not access camera or microphone'
      });
      endCall();
    }
  };
  
  const endCall = () => {
    // Stop all tracks in the local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
    }
    
    // Reset video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Reset call state
    setCallStatus('idle');
    setIsVideoCallActive(false);
    setIsMuted(false);
    setShowCallDialog(false);
  };
  
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
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
            fetchFriends();
            
            // Show notification
            const { data: senderData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', newMessage.sender_id)
              .single();
              
            if (senderData) {
              // Show browser notification
              if (Notification.permission === 'granted') {
                const notification = new Notification(`New message from ${senderData.name}`, {
                  body: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
                  icon: '/favicon.ico'
                });
                
                notification.onclick = () => {
                  window.focus();
                  // Find the friend and select them
                  const friend = friends.find(f => f.id === newMessage.sender_id);
                  if (friend) {
                    setSelectedFriend(friend);
                    fetchMessages(friend.id);
                  }
                };
              }
              
              // Show toast notification
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

    // Request notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

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
          <div className={`friends-sidebar w-full md:w-1/4 border-r p-4 overflow-y-auto ${mobileView && selectedFriend ? 'hidden' : ''}`}>
            <h3 className="font-pixelated mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" /> Contacts
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
              >
                <Trash className="h-4 w-4" />
              </Button>
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
                        ? 'bg-primary text-white' 
                        : 'hover:bg-muted/50'
                    } pixel-border pixel-shadow`}
                    onClick={() => handleSelectFriend(friend)}
                  >
                    <Avatar>
                      {friend.avatar ? (
                        <AvatarImage src={friend.avatar} />
                      ) : (
                        <AvatarFallback className="bg-primary text-white font-pixelated">
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
                <p className="text-muted-foreground mb-4 font-pixelated">No friends yet</p>
                <p className="text-sm mt-1">Add friends to start chatting</p>
                <Button variant="outline" className="mt-4 bg-primary text-white hover:bg-primary/90 font-pixelated" asChild>
                  <a href="/friends">Find Friends</a>
                </Button>
              </div>
            )}
          </div>
          
          {/* Chat area */}
          <div className={`chat-container flex-1 flex flex-col overflow-hidden ${mobileView && !selectedFriend ? 'hidden' : ''}`}>
            {selectedFriend ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mobileView && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleBackToFriends}
                        className="mr-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Avatar>
                      {selectedFriend.avatar ? (
                        <AvatarImage src={selectedFriend.avatar} />
                      ) : (
                        <AvatarFallback className="bg-primary text-white font-pixelated">
                          {selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : 'UN'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-pixelated text-sm">{selectedFriend.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">@{selectedFriend.username || 'guest'}</p>
                    </div>
                  </div>
                  {/* Add call buttons */}
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => toast({
                        title: "Coming Soon",
                        description: "Voice calls will be available soon!",
                      })}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-primary"
                      onClick={startVideoCall}
                      disabled={isVideoCallActive || callStatus !== 'idle'}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
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
                                <AvatarFallback className="bg-primary text-white font-pixelated">
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
                      <p className="text-muted-foreground font-pixelated">Start the conversation!</p>
                    </div>
                  )}
                </div>
                
                {/* Message input */}
                <div className="p-4 border-t">
                  {networkStatus === 'offline' && (
                    <Alert className="mb-2 bg-amber-50 text-amber-800 border-amber-200">
                      <AlertDescription className="flex items-center">
                        <div className="h-2 w-2 bg-amber-500 rounded-full mr-2"></div>
                        You're offline. Messages will be sent when you reconnect.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type a message..." 
                      className="flex-1 min-h-[60px] max-h-[120px] focus-visible:ring-primary font-pixelated text-sm"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendingMessage}
                    />
                    <Button 
                      className="self-end bg-primary hover:bg-primary/90 text-white font-pixelated"
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
                <MessageSquare className="h-16 w-16 text-primary mb-4" />
                <h1 className="text-xl font-pixelated mb-2">Pixel Chat</h1>
                <p className="text-muted-foreground mb-6 max-w-md font-pixelated">
                  Select a friend to start chatting
                </p>
              </div>
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

      {/* Video Call Dialog */}
      <Dialog open={showCallDialog} onOpenChange={(open) => {
        if (!open) endCall();
        setShowCallDialog(open);
      }}>
        <DialogContent className="sm:max-w-[80%] md:max-w-[600px] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="font-pixelated flex items-center">
              <Video className="h-5 w-5 mr-2" />
              Video Call {callStatus === 'calling' ? '(Connecting...)' : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="relative h-[400px] bg-black">
            {/* Remote video (full size) */}
            <video 
              ref={remoteVideoRef} 
              className="w-full h-full object-cover" 
              autoPlay 
              playsInline
            />
            
            {/* Local video (picture-in-picture) */}
            <div className="absolute bottom-4 right-4 w-1/4 h-1/4 border-2 border-white rounded overflow-hidden pixel-shadow">
              <video 
                ref={localVideoRef} 
                className="w-full h-full object-cover" 
                autoPlay 
                playsInline 
                muted
              />
            </div>
          </div>
          
          {/* Call controls */}
          <DialogFooter className="p-4 border-t">
            <div className="flex justify-center w-full gap-4">
              <Button 
                variant="outline" 
                size="icon"
                className={`rounded-full ${isMuted ? 'bg-red-100 text-red-500' : ''}`}
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              
              <Button 
                variant="destructive" 
                size="icon"
                className="rounded-full"
                onClick={endCall}
              >
                <Phone className="h-5 w-5 rotate-135" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default Messages;
