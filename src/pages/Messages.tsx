
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

      // Get accepted friends with explicit field selection and proper naming
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
        
      if (error) throw error;
      
      // Format friends data
      const formattedFriends: Friend[] = [];
      
      friendsData?.forEach(friend => {
        // Determine if the current user is the sender or receiver
        const isSender = friend.sender_id === user.id;
        const friendProfile = isSender 
          ? friend.profiles["friends_receiver_id_fkey"] 
          : friend.profiles["friends_sender_id_fkey"];
        
        if (friendProfile && friendProfile.id) {
          formattedFriends.push({
            id: friendProfile.id,
            name: friendProfile.name || 'User',
            username: friendProfile.username || 'guest',
            avatar: friendProfile.avatar || ''
          });
        }
      });

      setFriends(formattedFriends);
      
      if (formattedFriends.length > 0 && !selectedFriend) {
        setSelectedFriend(formattedFriends[0]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
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
      
      // Insert new message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: selectedFriend.id,
          content: newMessage.trim()
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
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedFriend, currentUser, toast]);

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

  return (
    <DashboardLayout>
      <Card className="h-[calc(100vh-180px)] flex flex-col card-gradient">
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
                    <div className="h-10 w-10 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded w-24"></div>
                      <div className="h-4 bg-muted rounded w-32 mt-1"></div>
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
                    <Avatar>
                      {friend.avatar ? (
                        <AvatarImage src={friend.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white">
                          {friend.name ? friend.name.substring(0, 2).toUpperCase() : 'UN'}
                        </AvatarFallback>
                      )}
                    </Avatar>
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
                  <Avatar>
                    {selectedFriend.avatar ? (
                      <AvatarImage src={selectedFriend.avatar} />
                    ) : (
                      <AvatarFallback className="bg-social-dark-green text-white">
                        {selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : 'UN'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedFriend.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">@{selectedFriend.username || 'guest'}</p>
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
                            <div className={message.sender_id === currentUser?.id ? 'message-bubble-sent' : 'message-bubble-received'}>
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {format(new Date(message.created_at), 'HH:mm')}
                              </p>
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
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No conversation selected</h3>
                  <p className="text-muted-foreground mt-1">Select a friend to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

export default Messages;
