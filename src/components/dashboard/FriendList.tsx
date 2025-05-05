
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, X, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FriendProps {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status?: 'pending' | 'request' | 'friend' | 'none';
}

export function FriendCard({ friend }: { friend: FriendProps }) {
  const { toast } = useToast();
  
  const handleAddFriend = () => {
    toast({
      title: 'Friend request sent',
      description: `You've sent a request to ${friend.name}`,
    });
  };
  
  const handleAccept = () => {
    toast({
      title: 'Friend request accepted',
      description: `${friend.name} is now your friend!`,
    });
  };
  
  const handleReject = () => {
    toast({
      title: 'Friend request declined',
      description: `You've declined ${friend.name}'s request`,
      variant: 'destructive',
    });
  };
  
  const handleChat = () => {
    // Redirect to chat
    console.log('Chat with', friend.name);
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={friend.avatar} alt={friend.name} />
          <AvatarFallback>{friend.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{friend.name}</p>
          <p className="text-sm text-muted-foreground">@{friend.username}</p>
        </div>
      </div>
      <div>
        {friend.status === 'none' && (
          <Button size="sm" variant="outline" onClick={handleAddFriend} className="hover-scale">
            <UserPlus className="h-4 w-4 mr-2" />
            Add
          </Button>
        )}
        {friend.status === 'request' && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAccept} variant="outline" className="hover-scale">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleReject} variant="outline" className="hover-scale">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {friend.status === 'friend' && (
          <Button size="sm" onClick={handleChat} className="hover-scale">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
        )}
        {friend.status === 'pending' && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Pending</span>
        )}
      </div>
    </div>
  );
}

export function FriendList() {
  // Mock data for friends and suggested friends
  const friends: FriendProps[] = [
    {
      id: '1',
      name: 'Jane Smith',
      username: 'janesmith',
      avatar: 'https://i.pravatar.cc/150?u=janesmith',
      status: 'friend',
    },
    {
      id: '2',
      name: 'John Doe',
      username: 'johndoe',
      avatar: 'https://i.pravatar.cc/150?u=johndoe',
      status: 'friend',
    },
  ];
  
  const requests: FriendProps[] = [
    {
      id: '3',
      name: 'Alex Johnson',
      username: 'alexj',
      avatar: 'https://i.pravatar.cc/150?u=alexj',
      status: 'request',
    },
  ];
  
  const suggested: FriendProps[] = [
    {
      id: '4',
      name: 'Sarah Wilson',
      username: 'sarahw',
      avatar: 'https://i.pravatar.cc/150?u=sarahw',
      status: 'none',
    },
    {
      id: '5',
      name: 'Michael Brown',
      username: 'mikebrown',
      avatar: 'https://i.pravatar.cc/150?u=mikebrown',
      status: 'none',
    },
    {
      id: '6',
      name: 'Ella Martinez',
      username: 'ellam',
      avatar: 'https://i.pravatar.cc/150?u=ellam',
      status: 'none',
    },
  ];
  
  const pending: FriendProps[] = [
    {
      id: '7',
      name: 'Chris Lee',
      username: 'chrisl',
      avatar: 'https://i.pravatar.cc/150?u=chrisl',
      status: 'pending',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-social-magenta" />
              Friend Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((friend) => (
              <FriendCard key={friend.id} friend={friend} />
            ))}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-social-green" />
            Your Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {friends.length > 0 ? (
            friends.map((friend) => (
              <FriendCard key={friend.id} friend={friend} />
            ))
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              You don't have any friends yet. Send requests to people you know!
            </p>
          )}
        </CardContent>
      </Card>
      
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((friend) => (
              <FriendCard key={friend.id} friend={friend} />
            ))}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Suggested Friends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {suggested.map((friend) => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default FriendList;
