import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send, ArrowLeft, Menu } from 'lucide-react';
import { format } from 'date-fns';
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex-none h-16 px-4 border-b border-gray-200 flex items-center bg-white">
        <div className="flex items-center gap-3">
          <Menu className="h-6 w-6 text-gray-600" />
          <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
            <div className="text-white text-xs font-bold">💬</div>
          </div>
          <h1 className="text-xl font-bold text-gray-800">SocialChat</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Friends List - Left Sidebar */}
        <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col bg-white ${selectedFriend ? 'hidden md:flex' : ''}`}>
          {/* Friends List */}
          <div className="flex-1 overflow-y-auto bg-gray-50" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
              <div className="p-2">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      selectedFriend?.id === friend.id 
                        ? 'bg-green-100 border-l-4 border-green-600' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedFriend(friend);
                      fetchMessages(friend.id);
                    }}
                  >
                    <Avatar className="h-12 w-12">
                      {friend.avatar ? (
                        <AvatarImage src={friend.avatar} />
                      ) : (
                        <AvatarFallback className="bg-green-600 text-white font-bold">
                          {friend.name ? friend.name.substring(0, 2).toUpperCase() : 'UN'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{friend.name}</p>
                      <p className="text-sm text-gray-500 truncate">@{friend.username}</p>
                    </div>
                    {friend.hasUnseenMessages && (
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-gray-500 mb-4">No friends yet</p>
                <Button variant="outline" size="sm" asChild>
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
              <div className="flex-none h-16 px-4 border-b border-gray-200 flex items-center bg-white">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFriend(null)}
                  className="md:hidden mr-3"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 mr-3">
                  {selectedFriend.avatar ? (
                    <AvatarImage src={selectedFriend.avatar} />
                  ) : (
                    <AvatarFallback className="bg-green-600 text-white font-bold">
                      {selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : 'UN'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{selectedFriend.name}</p>
                  <p className="text-sm text-gray-500">@{selectedFriend.username}</p>
                </div>
              </div>
              
              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto bg-gray-50 p-4" 
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none'
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                {messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`flex items-start gap-3 ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          {message.sender?.avatar ? (
                            <AvatarImage src={message.sender.avatar} />
                          ) : (
                            <AvatarFallback className="bg-green-600 text-white text-xs font-bold">
                              {message.sender?.name ? message.sender.name.substring(0, 2).toUpperCase() : 'UN'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        <div className={`max-w-[70%] ${message.sender_id === currentUser?.id ? 'text-right' : 'text-left'}`}>
                          <div className={`inline-block px-4 py-2 rounded-2xl ${
                            message.sender_id === currentUser?.id 
                              ? 'bg-gray-800 text-white rounded-br-md' 
                              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                          }`}>
                            <p className="text-sm leading-relaxed">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">Start the conversation!</p>
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="flex-none bg-white border-t border-gray-200 p-4">
                <div className="flex items-center gap-3 max-w-full">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-green-500 bg-gray-50"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendingMessage}
                  />
                  <Button 
                    className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 text-white shrink-0"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Send className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Select a chat</h1>
              <p className="text-gray-500 max-w-sm">
                Choose a friend from your contacts to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messages;
