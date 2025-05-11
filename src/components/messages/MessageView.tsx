
import React, { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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
  pending?: boolean;
}

interface MessageViewProps {
  messages: Message[];
  selectedFriend: Friend | null;
  currentUser: { id: string; name: string; avatar: string } | null;
  mobileView: boolean;
  onBackToFriends: () => void;
}

export const MessageView: React.FC<MessageViewProps> = ({
  messages,
  selectedFriend,
  currentUser,
  mobileView,
  onBackToFriends
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!selectedFriend) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in">
        <div className="h-16 w-16 text-primary mb-4">
          <img 
            src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
            alt="SocialChat" 
            className="w-full h-full object-contain" 
          />
        </div>
        <h1 className="text-xl font-pixelated mb-2">Pixel Chat</h1>
        <p className="text-muted-foreground mb-6 max-w-md font-pixelated">
          Select a friend to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          {mobileView && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBackToFriends}
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
                  <div className={`${message.sender_id === currentUser?.id ? 'message-bubble-sent' : 'message-bubble-received'} ${message.pending ? 'opacity-70' : ''} font-pixelated text-xs`}>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs opacity-70">
                        {format(new Date(message.created_at), 'HH:mm')}
                      </p>
                      {message.pending && (
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
    </div>
  );
};
