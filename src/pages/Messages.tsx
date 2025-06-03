import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, User, ArrowLeft } from 'lucide-react';
import { format, isToday, isYesterday, format as formatDate } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

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
            // Get the latest message with this friend
            const { data: latestMessage } = await supabase
              .from('messages')
              .select('created_at, sender_id, read')
              .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            // Check for unseen messages
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

      // Sort friends by latest message activity
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

      // Clear message immediately to prevent layout shifts
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

        // Update friend's last message time and move to top
        setFriends(prevFriends => {
          const updatedFriends = prevFriends.map(friend => 
            friend.id === selectedFriend.id 
              ? { ...friend, lastMessageTime: data.created_at }
              : friend
          );
          
          // Sort again to move the friend to top
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
      
      // Mark messages as read when opening conversation
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
              
              // Update friends list to reflect new message activity
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
      <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col">
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Friends list */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedFriend ? 'hidden md:flex' : ''}`}>
            {/* Contacts Header */}
            <div className="p-4 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <h3 className="font-pixelated text-sm font-semibold">Contacts ({friends.length})</h3>
              </div>
            </div>
            
            {/* Contacts List */}
            <ScrollArea className="flex-1">
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
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover-scale relative ${
                        selectedFriend?.id === friend.id 
                          ? 'bg-primary text-white' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedFriend(friend);
                        fetchMessages(friend.id);
                      }}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          {friend.avatar ? (
                            <AvatarImage src={friend.avatar} />
                          ) : (
                            <AvatarFallback className="bg-primary text-white font-pixelated text-sm">
                              {friend.name ? friend.name.substring(0, 2).toUpperCase() : 'UN'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        {friend.hasUnseenMessages && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                        )}
                      </div>
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
          <div className={`flex-1 flex flex-col ${!selectedFriend ? 'hidden md:flex' : ''} relative`}>
            {selectedFriend ? (
              <>
                {/* Fixed Chat Header */}
                <div className="p-4 border-b flex items-center gap-3 bg-background/95 backdrop-blur-sm shrink-0 z-20 shadow-sm">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedFriend(null)}
                    className="md:hidden h-8 w-8 p-0 border-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    {selectedFriend.avatar ? (
                      <AvatarImage src={selectedFriend.avatar} />
                    ) : (
                      <AvatarFallback className="bg-primary text-white font-pixelated text-sm">
                        {selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : 'UN'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-pixelated text-base font-medium truncate">{selectedFriend.name}</p>
                    <p className="text-sm text-muted-foreground truncate">@{selectedFriend.username}</p>
                  </div>
                </div>
                
                {/* Messages Area - Full height with no gaps */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {/* Scrollable Messages Container */}
                  <div className="flex-1 overflow-y-auto p-4 pb-0">
                    {messages.length > 0 ? (
                      <div className="space-y-6">
                        {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
                          <div key={date}>
                            {/* Date Separator */}
                            <div className="flex items-center gap-3 mb-4">
                              <div className="h-px bg-border flex-1" />
                              <span className="text-xs font-pixelated text-muted-foreground px-3 py-1 bg-muted rounded-full">
                                {date}
                              </span>
                              <div className="h-px bg-border flex-1" />
                            </div>
                            
                            {/* Messages for this date */}
                            <div className="space-y-3">
                              {dateMessages.map((message) => (
                                <div 
                                  key={message.id}
                                  className={`flex gap-2 ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                                >
                                  {message.sender_id !== currentUser?.id && (
                                    <Avatar className="h-8 w-8">
                                      {message.sender?.avatar ? (
                                        <AvatarImage src={message.sender.avatar} />
                                      ) : (
                                        <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                                          {message.sender?.name ? message.sender.name.substring(0, 2).toUpperCase() : 'UN'}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                  )}
                                  
                                  <div className={`max-w-[75%] ${message.sender_id === currentUser?.id ? 'ml-8' : 'mr-8'}`}>
                                    <div className={`p-3 rounded-2xl font-pixelated text-sm leading-relaxed ${
                                      message.sender_id === currentUser?.id 
                                        ? 'bg-primary text-white rounded-br-md' 
                                        : 'bg-muted text-foreground rounded-bl-md'
                                    }`}>
                                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                    </div>
                                    <p className={`text-xs text-muted-foreground mt-1 font-pixelated ${
                                      message.sender_id === currentUser?.id ? 'text-right' : 'text-left'
                                    }`}>
                                      {format(new Date(message.created_at), 'HH:mm')}
                                    </p>
                                  </div>
                                  
                                  {message.sender_id === currentUser?.id && (
                                    <Avatar className="h-8 w-8">
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
                          </div>
                        ))}
                        <div ref={messagesEndRef} className="h-4" />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <Send className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-pixelated text-sm">Start the conversation!</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Fixed Message Input - No gaps, perfect alignment */}
                  <div className="border-t bg-background shrink-0 z-10">
                    <div className="p-4">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <Textarea 
                            placeholder="Type a message..." 
                            className="min-h-[48px] max-h-[120px] font-pixelated text-sm resize-none border-2 rounded-2xl"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={sendingMessage}
                            rows={1}
                          />
                        </div>
                        <Button 
                          className="bg-primary hover:bg-primary/90 text-white font-pixelated h-[48px] w-[48px] p-0 rounded-full flex-shrink-0"
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sendingMessage}
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 font-pixelated text-center">
                        Press Enter to send • Shift+Enter for new line
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  <Send className="h-10 w-10 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-pixelated font-bold mb-3">Select a chat</h1>
                <p className="text-muted-foreground font-pixelated text-sm max-w-sm">
                  Choose a friend from your contacts to start messaging with real-time updates
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
