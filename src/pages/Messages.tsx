import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send, User, ArrowLeft } from 'lucide-react';
import { format, isToday, isYesterday, format as formatDate } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessageTime?: string;
  hasUnseenMessages?: boolean;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
            const { data: latestMessage } = await supabase
              .from('messages')
              .select('created_at, sender_id, read')
              .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const { data: unseenMessages } = await supabase
              .from('messages')
              .select('id')
              .eq('sender_id', friendId)
              .eq('receiver_id', user.id)
              .eq('read', false);

            formattedFriends.push({
              id: friendProfile.id,
              name: friendProfile.name || 'User',
              username: friendProfile.username || 'guest',
              avatar: friendProfile.avatar || '',
              lastMessageTime: latestMessage?.created_at,
              hasUnseenMessages: (unseenMessages?.length || 0) > 0
            });
          }
        }
      }

      formattedFriends.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

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

      const messageContent = newMessage.trim();
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

        setFriends(prevFriends => {
          const updatedFriends = prevFriends.map(friend => 
            friend.id === selectedFriend.id 
              ? { ...friend, lastMessageTime: data.created_at }
              : friend
          );
          
          return updatedFriends.sort((a, b) => {
            if (!a.lastMessageTime && !b.lastMessageTime) return 0;
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
          });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 100; // Maximum height
    const newHeight = Math.min(scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessage();
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };
  
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return formatDate(date, 'MMMM d, yyyy');
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = formatMessageDate(message.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

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
      
      const markAsRead = async () => {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('sender_id', selectedFriend.id)
          .eq('receiver_id', currentUser.id)
          .eq('read', false);
      };
      markAsRead();
      
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
              
              fetchFriends();
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              fetchMessages(selectedFriend.id);
            }
          }
        )
        .subscribe();

      const messageInterval = setInterval(() => {
        fetchMessages(selectedFriend.id);
      }, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(messageInterval);
      };
    }
  }, [selectedFriend, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <DashboardLayout>
      <div className="h-screen flex bg-background">
        {/* Friends Sidebar */}
        <div className={`w-full md:w-80 border-r flex flex-col ${selectedFriend ? 'hidden md:flex' : ''}`}>
          {/* Header */}
          <div className="h-16 px-4 border-b flex items-center bg-background">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-pixelated text-base font-semibold">Messages</h3>
              <span className="text-sm text-muted-foreground">({friends.length})</span>
            </div>
          </div>
          
          {/* Friends List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-1 p-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friends.length > 0 ? (
              <div className="space-y-1 p-2">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/60 ${
                      selectedFriend?.id === friend.id 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedFriend(friend);
                      fetchMessages(friend.id);
                    }}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-background">
                        {friend.avatar ? (
                          <AvatarImage src={friend.avatar} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white font-pixelated">
                            {friend.name ? friend.name.substring(0, 2).toUpperCase() : 'UN'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {friend.hasUnseenMessages && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                          <div className="h-2 w-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-pixelated font-medium truncate text-sm">{friend.name}</p>
                      <p className={`text-xs truncate ${selectedFriend?.id === friend.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                        @{friend.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-pixelated text-sm mb-4">No friends yet</p>
                <Button variant="outline" size="sm" className="font-pixelated" asChild>
                  <a href="/friends">Find Friends</a>
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${!selectedFriend ? 'hidden md:flex' : ''}`}>
          {selectedFriend ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 border-b flex items-center bg-background shadow-sm">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFriend(null)}
                  className="md:hidden mr-2 h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-10 w-10 border-2 border-muted">
                  {selectedFriend.avatar ? (
                    <AvatarImage src={selectedFriend.avatar} />
                  ) : (
                    <AvatarFallback className="bg-primary text-white font-pixelated">
                      {selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : 'UN'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="font-pixelated font-semibold truncate">{selectedFriend.name}</p>
                  <p className="text-sm text-muted-foreground truncate">@{selectedFriend.username}</p>
                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto bg-muted/20" style={{ height: 'calc(100vh - 140px)' }}>
                <div className="p-4 space-y-6">
                  {messages.length > 0 ? (
                    <>
                      {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
                        <div key={date} className="space-y-4">
                          {/* Date Separator */}
                          <div className="flex items-center justify-center">
                            <div className="bg-muted px-3 py-1 rounded-full">
                              <span className="text-xs font-pixelated text-muted-foreground">{date}</span>
                            </div>
                          </div>
                          
                          {/* Messages */}
                          {dateMessages.map((message) => (
                            <div 
                              key={message.id}
                              className={`flex gap-2 ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                            >
                              {message.sender_id !== currentUser?.id && (
                                <Avatar className="h-8 w-8 shrink-0">
                                  {message.sender?.avatar ? (
                                    <AvatarImage src={message.sender.avatar} />
                                  ) : (
                                    <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                                      {message.sender?.name ? message.sender.name.substring(0, 2).toUpperCase() : 'UN'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              )}
                              
                              <div className={`max-w-[75%] ${message.sender_id === currentUser?.id ? 'order-first' : ''}`}>
                                <div className={`px-4 py-2 rounded-2xl font-pixelated text-sm shadow-sm ${
                                  message.sender_id === currentUser?.id 
                                    ? 'bg-primary text-white rounded-br-md' 
                                    : 'bg-background border rounded-bl-md'
                                }`}>
                                  <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                                </div>
                                <p className={`text-xs text-muted-foreground mt-1 font-pixelated ${
                                  message.sender_id === currentUser?.id ? 'text-right' : 'text-left'
                                }`}>
                                  {format(new Date(message.created_at), 'HH:mm')}
                                </p>
                              </div>
                              
                              {message.sender_id === currentUser?.id && (
                                <Avatar className="h-8 w-8 shrink-0">
                                  {currentUser?.avatar ? (
                                    <AvatarImage src={currentUser.avatar} />
                                  ) : (
                                    <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                                      {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'ME'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <Send className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-pixelated">Start the conversation!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Message Input - Fixed at bottom */}
              <div className="bg-background border-t p-4" style={{ height: '80px' }}>
                <div className="flex items-end gap-3 max-w-full">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      placeholder="Type a message..."
                      className="w-full min-h-[40px] max-h-[100px] px-4 py-2 border-2 border-muted rounded-full resize-none font-pixelated text-sm bg-background focus:border-primary focus:outline-none"
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={sendingMessage}
                      style={{ height: '40px' }}
                    />
                  </div>
                  <Button 
                    className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-white shadow-md shrink-0"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-center font-pixelated">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Send className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="text-xl font-pixelated font-bold mb-3">Select a chat</h1>
              <p className="text-muted-foreground font-pixelated max-w-sm">
                Choose a friend from your contacts to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Messages;
