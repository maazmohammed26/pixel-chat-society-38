
import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, User, ArrowLeft, Info } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

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

      const { data: friendsData, error } = await supabase
        .from('friends')
        .select('id, sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      if (error) throw error;
      
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
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !currentUser || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        sender_id: currentUser.id,
        receiver_id: selectedFriend.id,
        content: newMessage.trim(),
        read: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
        
      if (error) throw error;

      setNewMessage('');
      
      if (data) {
        const newMessageWithSender = {
          ...data,
          sender: {
            name: currentUser.name,
            avatar: currentUser.avatar
          }
        };
        
        setMessages(prevMessages => {
          const exists = prevMessages.some(msg => msg.id === data.id);
          if (exists) return prevMessages;
          return [...prevMessages, newMessageWithSender];
        });
      }
      
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

  // Auto-refresh friends list every 30 seconds
  useEffect(() => {
    fetchFriends();
    
    const friendsInterval = setInterval(() => {
      fetchFriends();
    }, 30000);

    return () => clearInterval(friendsInterval);
  }, []);

  useEffect(() => {
    if (selectedFriend && currentUser) {
      fetchMessages(selectedFriend.id);
      
      // Set up real-time subscription for messages with auto-refresh
      const channel = supabase
        .channel(`messages-${selectedFriend.id}-${currentUser.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${currentUser.id}))`
          }, 
          async (payload) => {
            console.log('Real-time message update:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as Message;
              
              if (newMessage.sender_id !== currentUser.id) {
                const { data } = await supabase
                  .from('profiles')
                  .select('name, avatar')
                  .eq('id', newMessage.sender_id)
                  .single();
                  
                if (data) {
                  setMessages(prevMessages => {
                    const exists = prevMessages.some(msg => msg.id === newMessage.id);
                    if (exists) return prevMessages;
                    
                    const messageWithSender = {
                      ...newMessage,
                      sender: {
                        name: data.name || 'Unknown',
                        avatar: data.avatar || ''
                      }
                    };
                    
                    const updated = [...prevMessages, messageWithSender];
                    setTimeout(scrollToBottom, 100);
                    return updated;
                  });
                }
              }
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              // Refresh messages on update or delete
              fetchMessages(selectedFriend.id);
            }
          }
        )
        .subscribe();

      // Also set up a periodic refresh every 10 seconds for reliability
      const messageInterval = setInterval(() => {
        fetchMessages(selectedFriend.id);
      }, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(messageInterval);
      };
    }
  }, [selectedFriend, currentUser]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-background sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="font-pixelated text-base font-bold">Messages</h1>
          </div>
          <Button
            onClick={() => setShowInfo(true)}
            size="icon"
            className="h-7 w-7 rounded-full bg-social-blue hover:bg-social-blue/90 text-white hover-scale"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Info Dialog */}
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogContent className="max-w-sm mx-auto animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
                Real-time Messaging
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Chat with your friends in real-time. Messages are automatically updated without refreshing the page.
              </p>
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Select a friend from your contacts to start a conversation. Your friends list updates every 30 seconds.
              </p>
              <Button 
                onClick={() => setShowInfo(false)}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6 hover-scale"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden h-[calc(100vh-120px)]">
          {/* Friends list */}
          <div className={`w-full md:w-1/3 border-r overflow-hidden ${selectedFriend ? 'hidden md:block' : ''}`}>
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <h3 className="font-pixelated text-sm font-semibold">Contacts ({friends.length})</h3>
              </div>
            </div>
            <ScrollArea className="h-full">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friends.length > 0 ? (
                <div className="p-2 space-y-1">
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFriend?.id === friend.id 
                          ? 'bg-primary text-white' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedFriend(friend);
                        fetchMessages(friend.id);
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        {friend.avatar ? (
                          <AvatarImage src={friend.avatar} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white font-pixelated text-sm">
                            {friend.name ? friend.name.substring(0, 2).toUpperCase() : 'UN'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-pixelated text-sm font-medium truncate">{friend.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-pixelated text-sm mb-3">No friends yet</p>
                  <Button variant="outline" className="font-pixelated text-sm" asChild>
                    <a href="/friends">Find Friends</a>
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Chat area */}
          <div className={`flex-1 flex flex-col overflow-hidden ${!selectedFriend ? 'hidden md:flex' : ''}`}>
            {selectedFriend ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b flex items-center gap-3 bg-muted/30">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedFriend(null)}
                    className="md:hidden h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    {selectedFriend.avatar ? (
                      <AvatarImage src={selectedFriend.avatar} />
                    ) : (
                      <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                        {selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : 'UN'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-pixelated text-sm font-medium truncate">{selectedFriend.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{selectedFriend.username}</p>
                  </div>
                  <div className="text-xs text-muted-foreground font-pixelated">
                    Real-time
                  </div>
                </div>
                
                {/* Messages */}
                <ScrollArea className="flex-1 p-3">
                  {messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex gap-2 animate-fade-in ${
                            message.sender_id === currentUser?.id ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            {message.sender?.avatar ? (
                              <AvatarImage src={message.sender.avatar} />
                            ) : (
                              <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                                {message.sender?.name ? message.sender.name.substring(0, 2).toUpperCase() : 'UN'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          <div className={`flex flex-col max-w-[75%] ${
                            message.sender_id === currentUser?.id ? 'items-end' : 'items-start'
                          }`}>
                            <div 
                              className={`p-2.5 rounded-2xl text-sm font-pixelated leading-relaxed break-words ${
                                message.sender_id === currentUser?.id 
                                  ? 'bg-social-blue text-white rounded-br-md' 
                                  : 'bg-muted text-foreground rounded-bl-md'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <p className={`text-xs text-muted-foreground mt-1 font-pixelated ${
                              message.sender_id === currentUser?.id ? 'text-right' : 'text-left'
                            }`}>
                              {format(new Date(message.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground font-pixelated text-sm">Start the conversation!</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
                
                {/* Message input */}
                <div className="p-3 border-t bg-background">
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type a message..." 
                      className="flex-1 min-h-[44px] max-h-[120px] font-pixelated text-sm resize-none border-2 focus:border-social-green transition-colors"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendingMessage}
                    />
                    <Button 
                      className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated h-[44px] w-[44px] p-0 flex-shrink-0 rounded-full hover-scale"
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-pixelated">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="h-16 w-16 text-primary mb-4" />
                <h1 className="text-lg font-pixelated font-bold mb-2">Select a chat</h1>
                <p className="text-muted-foreground font-pixelated text-sm">
                  Choose a friend to start messaging with real-time updates
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Messages;
