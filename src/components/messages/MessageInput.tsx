
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  networkStatus: 'online' | 'offline';
  sendingMessage: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  networkStatus,
  sendingMessage
}) => {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
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
          onClick={handleSend}
          disabled={!newMessage.trim() || sendingMessage}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
