
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, UserPlus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  status?: string;
  friend_id?: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  profiles: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

export function FriendList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchFriendRequests();
      fetchSuggestions();
      
      // Set up real-time subscriptions
      const friendsChannel = supabase
        .channel('friends-channel')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'friends' }, 
          () => {
            fetchFriends();
            fetchFriendRequests();
            fetchSuggestions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(friendsChannel);
      };
    }
  }, [currentUser]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchFriends = async () => {
    if (!currentUser) return;

    try {
      const { data: friendsData, error } = await supabase
        .from('friends')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          profiles!friends_sender_id_fkey(name, username, avatar),
          profiles!friends_receiver_id_fkey(name, username, avatar)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (error) throw error;

      const formattedFriends: Friend[] = friendsData?.map((friend: any) => {
        const isSender = friend.sender_id === currentUser.id;
        const profile = isSender ? friend.profiles : friend.profiles;
        
        return {
          id: isSender ? friend.receiver_id : friend.sender_id,
          name: profile?.name || 'Unknown',
          username: profile?.username || 'unknown',
          avatar: profile?.avatar,
          friend_id: friend.id
        };
      }) || [];

      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchFriendRequests = async () => {
    if (!currentUser) return;

    try {
      const { data: requestsData, error } = await supabase
        .from('friends')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          profiles!friends_sender_id_fkey(name, username, avatar)
        `)
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending');

      if (error) throw error;

      setFriendRequests(requestsData || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const fetchSuggestions = async () => {
    if (!currentUser) return;

    try {
      // Get current friends and pending requests
      const { data: existingConnections } = await supabase
        .from('friends')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      const excludeIds = new Set([currentUser.id]);
      existingConnections?.forEach(conn => {
        excludeIds.add(conn.sender_id);
        excludeIds.add(conn.receiver_id);
      });

      const { data: suggestionsData, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
        .limit(5);

      if (error) throw error;

      const formattedSuggestions: Friend[] = suggestionsData?.map(profile => ({
        id: profile.id,
        name: profile.name || 'Unknown',
        username: profile.username || 'unknown',
        avatar: profile.avatar
      })) || [];

      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!currentUser || !searchQuery.trim()) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq('id', currentUser.id)
        .limit(10);

      if (error) throw error;

      const formattedResults: Friend[] = data?.map(profile => ({
        id: profile.id,
        name: profile.name || 'Unknown',
        username: profile.username || 'unknown',
        avatar: profile.avatar
      })) || [];

      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          sender_id: currentUser.id,
          receiver_id: userId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Friend request sent',
        description: 'Your friend request has been sent successfully!',
      });

      fetchSuggestions();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send friend request',
      });
    }
  };

  const respondToFriendRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      if (action === 'accept') {
        const { error } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: 'Friend request accepted',
          description: 'You are now friends!',
        });
      } else {
        const { error } = await supabase
          .from('friends')
          .delete()
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: 'Friend request declined',
          description: 'Friend request has been declined.',
        });
      }

      fetchFriendRequests();
      fetchFriends();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to respond to friend request',
      });
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);

      if (error) throw error;

      toast({
        title: 'Friend removed',
        description: 'Friend has been removed from your list.',
      });

      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove friend',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-24 mb-1" />
                  <Skeleton className="h-2 w-20" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <Card className="card-gradient">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-7 h-8 font-pixelated text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="card-gradient">
          <CardHeader className="pb-2">
            <CardTitle className="font-pixelated text-sm">Search Results</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {searchResults.map(user => (
                <div key={user.id} className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-pixelated text-xs font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground font-pixelated">@{user.username}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => sendFriendRequest(user.id)}
                    size="sm"
                    className="h-6 px-2 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <Card className="card-gradient">
          <CardHeader className="pb-2">
            <CardTitle className="font-pixelated text-sm">Friend Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {friendRequests.map(request => (
                <div key={request.id} className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {request.profiles?.avatar ? (
                        <AvatarImage src={request.profiles.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                          {request.profiles?.name ? request.profiles.name.substring(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-pixelated text-xs font-medium">{request.profiles?.name}</p>
                      <p className="text-xs text-muted-foreground font-pixelated">@{request.profiles?.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => respondToFriendRequest(request.id, 'accept')}
                      size="sm"
                      className="h-6 w-6 p-0 bg-social-green hover:bg-social-light-green text-white"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => respondToFriendRequest(request.id, 'decline')}
                      size="sm"
                      variant="destructive"
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Friends */}
      {friends.length > 0 && (
        <Card className="card-gradient">
          <CardHeader className="pb-2">
            <CardTitle className="font-pixelated text-sm">My Friends ({friends.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {friend.avatar ? (
                        <AvatarImage src={friend.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                          {friend.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-pixelated text-xs font-medium">{friend.name}</p>
                      <p className="text-xs text-muted-foreground font-pixelated">@{friend.username}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => friend.friend_id && removeFriend(friend.friend_id)}
                    size="sm"
                    variant="destructive"
                    className="h-6 px-2 text-xs font-pixelated"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="card-gradient">
          <CardHeader className="pb-2">
            <CardTitle className="font-pixelated text-sm">Suggested Friends</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {suggestions.map(user => (
                <div key={user.id} className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-pixelated text-xs font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground font-pixelated">@{user.username}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => sendFriendRequest(user.id)}
                    size="sm"
                    className="h-6 px-2 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {friends.length === 0 && friendRequests.length === 0 && suggestions.length === 0 && (
        <Card className="card-gradient">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground font-pixelated text-sm">No friends or suggestions yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
