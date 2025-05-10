
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, X, MessageSquare, UserCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { UserSearch } from './UserSearch';

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
  const navigate = useNavigate();
  
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
        className: 'bg-social-dark-green text-white',
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
        className: 'bg-social-dark-green text-white',
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
    navigate('/messages');
    toast({
      title: 'Opening chat',
      description: `Starting conversation with ${friend.name}`,
      className: 'bg-social-dark-green text-white',
    });
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={friend.avatar} alt={friend.name} />
          <AvatarFallback className="bg-social-dark-green text-white">{friend.name.substring(0, 2).toUpperCase()}</AvatarFallback>
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
            className="hover-scale bg-social-dark-green hover:bg-social-forest-green text-white"
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
              variant="default" 
              className="hover-scale bg-social-dark-green hover:bg-social-forest-green text-white"
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
            className="hover-scale bg-social-dark-green hover:bg-social-forest-green text-white"
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
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendProps[]>([]);
  const [requests, setRequests] = useState<FriendProps[]>([]);
  const [suggested, setSuggested] = useState<FriendProps[]>([]);
  const [pending, setPending] = useState<FriendProps[]>([]);
  const { toast } = useToast();
  
  const fetchFriendData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("You must be logged in to view friends");
        setLoading(false);
        return;
      }
      
      console.log("Fetching friends data for user:", user.id);
      
      // Get accepted friends - fixed query to avoid table name conflicts
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          id,
          sender_id,
          receiver_id,
          sender_profile:profiles!sender_id(id, name, username, avatar),
          receiver_profile:profiles!receiver_id(id, name, username, avatar)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
      
      if (friendsError) {
        console.error("Error fetching friends:", friendsError);
        setError("Failed to load friend data. Please try again.");
        return;
      }
        
      // Format friends data with proper property access
      const formattedFriends = friendsData?.map(friend => {
        const isSender = friend.sender_id === user.id;
        const friendProfile = isSender 
          ? friend.receiver_profile
          : friend.sender_profile;
        
        return {
          id: friendProfile.id,
          name: friendProfile.name,
          username: friendProfile.username,
          avatar: friendProfile.avatar,
          status: 'friend' as const,
          relationship_id: friend.id
        };
      }) || [];
      
      console.log("Formatted friends:", formattedFriends);
      
      // Get friend requests (where user is receiver) - fixed query
      const { data: requestsData, error: requestsError } = await supabase
        .from('friends')
        .select(`
          id,
          sender_id,
          sender_profile:profiles!sender_id(id, name, username, avatar)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      
      if (requestsError) {
        console.error("Error fetching requests:", requestsError);
      }
        
      // Format requests data with proper property access
      const formattedRequests = requestsData?.map(request => ({
        id: request.sender_profile.id,
        name: request.sender_profile.name,
        username: request.sender_profile.username,
        avatar: request.sender_profile.avatar,
        status: 'request' as const,
        relationship_id: request.id
      })) || [];
      
      console.log("Formatted requests:", formattedRequests);
      
      // Get pending requests (where user is sender) - fixed query
      const { data: pendingData, error: pendingError } = await supabase
        .from('friends')
        .select(`
          id,
          receiver_id,
          receiver_profile:profiles!receiver_id(id, name, username, avatar)
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending');
      
      if (pendingError) {
        console.error("Error fetching pending requests:", pendingError);
      }
        
      // Format pending data with proper property access
      const formattedPending = pendingData?.map(pending => ({
        id: pending.receiver_profile.id,
        name: pending.receiver_profile.name,
        username: pending.receiver_profile.username,
        avatar: pending.receiver_profile.avatar,
        status: 'pending' as const,
        relationship_id: pending.id
      })) || [];
      
      console.log("Formatted pending:", formattedPending);
      
      // Get all user IDs to exclude from suggestions
      const allUserIds = [
        user.id,
        ...formattedFriends.map(f => f.id),
        ...formattedRequests.map(r => r.id),
        ...formattedPending.map(p => p.id)
      ].filter(Boolean);
      
      console.log("Excluding user IDs from suggestions:", allUserIds);
      
      // Get suggested friends (other users not in any relationship with current user)
      let suggestedQuery = supabase
        .from('profiles')
        .select('id, name, username, avatar');
      
      if (allUserIds.length > 0) {
        suggestedQuery = suggestedQuery.not('id', 'in', `(${allUserIds.join(',')})`);
      } else {
        suggestedQuery = suggestedQuery.neq('id', user.id);
      }
      
      const { data: suggestedData, error: suggestedError } = await suggestedQuery.limit(5);
      
      if (suggestedError) {
        console.error("Error fetching suggestions:", suggestedError);
      }
        
      // Format suggested data
      const formattedSuggested = suggestedData?.map(profile => ({
        id: profile.id,
        name: profile.name,
        username: profile.username,
        avatar: profile.avatar,
        status: 'none' as const
      })) || [];
      
      console.log("Formatted suggestions:", formattedSuggested);
      
      setFriends(formattedFriends);
      setRequests(formattedRequests);
      setPending(formattedPending);
      setSuggested(formattedSuggested);
    } catch (error) {
      console.error('Error fetching friend data:', error);
      setError("Failed to load friend data. Please try again.");
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
    
    // Set up realtime subscriptions
    const friendsChannel = supabase
      .channel('friends-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'friends' }, 
        (payload) => {
          console.log('Friends table changed:', payload);
          fetchFriendData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(friendsChannel);
    };
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

  if (error) {
    return (
      <Card className="text-center p-6">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to load friend data</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button 
          onClick={fetchFriendData}
          className="bg-social-dark-green hover:bg-social-forest-green text-white"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="mb-4">
        <CardContent className="pt-4">
          <UserSearch />
        </CardContent>
      </Card>
      
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
            <UserCheck className="h-5 w-5 text-social-green" />
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
      
      {suggested.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Suggested Friends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggested.map((friend) => (
              <FriendCard key={friend.id} friend={friend} onAction={fetchFriendData} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FriendList;
