
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface MessagesListProps {
  friends: Friend[];
  loading: boolean;
  selectedFriend: Friend | null;
  onSelectFriend: (friend: Friend) => void;
  onDeleteAccount: () => void;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  friends,
  loading,
  selectedFriend,
  onSelectFriend,
  onDeleteAccount
}) => {
  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <h3 className="font-pixelated mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <User className="h-4 w-4" /> Contacts
        </span>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onDeleteAccount}
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
              onClick={() => onSelectFriend(friend)}
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
  );
};
