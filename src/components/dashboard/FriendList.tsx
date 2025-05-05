
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, X, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FriendProps {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status?: 'pending' | 'request' | 'friend' | 'none';
  relationship_id?: string;
}

export function FriendCard({ friend, onAction }: { 
  friend: FriendProps; 
  onAction?: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAddFriend = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to add friends',
        });
        return;
      }
      
      // Check if a request already exists
      const { data: existingRequests } = await supabase
        .from('friends')
        .select('*')
        .or(`sender_id.eq.${user.id}.and.receiver_id.eq.${friend.id},sender_id.eq.${friend.id}.and.receiver_id.eq.${user.id}`);
        
      if (existingRequests && existingRequests.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Friend request exists',
          description: 'A friend request already exists between you and this user',
        });
        return;
      }
      
      // Insert friend request
      await supabase
        .from('friends')
        .insert([
          { sender_id: user.id, receiver_id: friend.id, status: 'pending' }
        ]);
      
      toast({
        title: 'Friend request sent',
        description: `You've sent a request to ${friend.name}`,
      });
      
      if (onAction) onAction();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send friend request',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAccept = async () => {
    setIsLoading(true);
    try {
      if (!friend.relationship_id) {
        throw new Error('Relationship ID not found');
      }
      
      await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friend.relationship_id);
      
      toast({
        title: 'Friend request accepted',
        description: `${friend.name} is now your friend!`,
      });
      
      if (onAction) onAction();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept friend request',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReject = async () => {
    setIsLoading(true);
    try {
      if (!friend.relationship_id) {
        throw new Error('Relationship ID not found');
      }
      
      await supabase
        .from('friends')
        .delete()
        .eq('id', friend.relationship_id);
      
      toast({
        title: 'Friend request declined',
        description: `You've declined ${friend.name}'s request`,
        variant: 'destructive',
      });
      
      if (onAction) onAction();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject friend request',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChat = () => {
    // Redirect to chat
    toast({
      title: 'Coming soon!',
      description: 'Chat feature will be available soon.',
    });
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
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleAddFriend} 
            className="hover-scale"
            disabled={isLoading}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add
          </Button>
        )}
        {friend.status === 'request' && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleAccept} 
              variant="outline" 
              className="hover-scale"
              disabled={isLoading}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleReject} 
              variant="outline" 
              className="hover-scale"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {friend.status === 'friend' && (
          <Button 
            size="sm" 
            onClick={handleChat} 
            className="hover-scale"
            disabled={isLoading}
          >
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
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendProps[]>([]);
  const [requests, setRequests] = useState<FriendProps[]>([]);
  const [suggested, setSuggested] = useState<FriendProps[]>([]);
  const [pending, setPending] = useState<FriendProps[]>([]);
  const { toast } = useToast();
  
  const fetchFriendData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // Get accepted friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select(`
          id,
          profiles!friends_sender_id_fkey (id, name, username, avatar),
          profiles!friends_receiver_id_fkey (id, name, username, avatar)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      // Format friends data
      const formattedFriends = friendsData?.map(friend => {
        const isSender = friend.profiles!friends_sender_id_fkey.id !== user.id;
        const friendProfile = isSender ? 
          friend.profiles!friends_sender_id_fkey : 
          friend.profiles!friends_receiver_id_fkey;
        
        return {
          id: friendProfile.id,
          name: friendProfile.name,
          username: friendProfile.username,
          avatar: friendProfile.avatar,
          status: 'friend' as const,
          relationship_id: friend.id
        };
      }) || [];
      
      // Get friend requests (where user is receiver)
      const { data: requestsData } = await supabase
        .from('friends')
        .select(`
          id,
          profiles!friends_sender_id_fkey (id, name, username, avatar)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
        
      // Format requests data
      const formattedRequests = requestsData?.map(request => ({
        id: request.profiles!friends_sender_id_fkey.id,
        name: request.profiles!friends_sender_id_fkey.name,
        username: request.profiles!friends_sender_id_fkey.username,
        avatar: request.profiles!friends_sender_id_fkey.avatar,
        status: 'request' as const,
        relationship_id: request.id
      })) || [];
      
      // Get pending requests (where user is sender)
      const { data: pendingData } = await supabase
        .from('friends')
        .select(`
          id,
          profiles!friends_receiver_id_fkey (id, name, username, avatar)
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending');
        
      // Format pending data
      const formattedPending = pendingData?.map(pending => ({
        id: pending.profiles!friends_receiver_id_fkey.id,
        name: pending.profiles!friends_receiver_id_fkey.name,
        username: pending.profiles!friends_receiver_id_fkey.username,
        avatar: pending.profiles!friends_receiver_id_fkey.avatar,
        status: 'pending' as const,
        relationship_id: pending.id
      })) || [];
      
      // Get all user IDs to exclude from suggestions
      const allUserIds = [
        user.id,
        ...formattedFriends.map(f => f.id),
        ...formattedRequests.map(r => r.id),
        ...formattedPending.map(p => p.id)
      ];
      
      // Get suggested friends (other users not in any relationship with current user)
      const { data: suggestedData } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .not('id', 'in', `(${allUserIds.join(',')})`)
        .limit(5);
        
      // Format suggested data
      const formattedSuggested = suggestedData?.map(profile => ({
        id: profile.id,
        name: profile.name,
        username: profile.username,
        avatar: profile.avatar,
        status: 'none' as const
      })) || [];
      
      setFriends(formattedFriends);
      setRequests(formattedRequests);
      setPending(formattedPending);
      setSuggested(formattedSuggested);
    } catch (error) {
      console.error('Error fetching friend data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load friend data',
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchFriendData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card>
          <CardHeader className="pb-3">
            <div className="h-6 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted"></div>
                  <div>
                    <div className="h-5 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-20 mt-1"></div>
                  </div>
                </div>
                <div className="h-8 w-16 bg-muted rounded"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <FriendCard key={friend.id} friend={friend} onAction={fetchFriendData} />
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
              <FriendCard key={friend.id} friend={friend} onAction={fetchFriendData} />
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
              <FriendCard key={friend.id} friend={friend} onAction={fetchFriendData} />
            ))}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Suggested Friends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {suggested.length > 0 ? (
            suggested.map((friend) => (
              <FriendCard key={friend.id} friend={friend} onAction={fetchFriendData} />
            ))
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No suggestions available at this time.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FriendList;
