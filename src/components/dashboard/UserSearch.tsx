
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [requestInProgress, setRequestInProgress] = useState<Record<string, boolean>>({});
  const [isUsernameSearch, setIsUsernameSearch] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setResults([]);
    
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'Please log in to search for friends',
        });
        return;
      }
      
      // Search profiles by name or username
      let query = supabase
        .from('profiles')
        .select('id, name, username, avatar');
        
      // If searching by username only (with @), remove the @ and search only username
      if (searchTerm.startsWith('@')) {
        const username = searchTerm.substring(1);
        query = query.ilike('username', `%${username}%`);
        setIsUsernameSearch(true);
      } else {
        query = query.or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`);
        setIsUsernameSearch(false);
      }
      
      const { data, error } = await query
        .neq('id', currentUser.user.id)
        .limit(10);
        
      if (error) throw error;
      
      // Filter out existing friends or pending requests
      const { data: connections, error: connectionsError } = await supabase
        .from('friends')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${currentUser.user.id},receiver_id.eq.${currentUser.user.id}`);
      
      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
        // Continue with search results without filtering
        setResults(data);
        return;
      }
      
      const filteredResults = data.filter(user => {
        // Check if there's an existing connection
        return !connections?.some(conn => 
          (conn.sender_id === currentUser.user?.id && conn.receiver_id === user.id) || 
          (conn.receiver_id === currentUser.user?.id && conn.sender_id === user.id)
        );
      });
      
      setResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Failed to search for users. Please try again.',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const sendFriendRequest = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'Please log in to send friend requests',
        });
        return;
      }
      
      setRequestInProgress(prev => ({ ...prev, [userId]: true }));
      
      // Double-check that no relationship exists already
      const { data: existing } = await supabase
        .from('friends')
        .select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
        .maybeSingle();
        
      if (existing) {
        toast({
          variant: 'destructive',
          title: 'Request exists',
          description: 'A friend relationship already exists with this user',
        });
        return;
      }
      
      // Send friend request
      const { error } = await supabase
        .from('friends')
        .insert([
          { sender_id: user.id, receiver_id: userId, status: 'pending' }
        ]);
        
      if (error) throw error;
      
      // Update results to remove user
      setResults(prevResults => prevResults.filter(u => u.id !== userId));
      
      toast({
        title: 'Friend request sent',
        description: 'Your request was sent successfully',
        className: 'bg-social-dark-green text-white',
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send friend request. Please try again.',
      });
    } finally {
      setRequestInProgress(prev => ({ ...prev, [userId]: false }));
    }
  };

  const viewProfile = (userId: string) => {
    setOpen(false);
    navigate(`/profile/${userId}`);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full">
          <Search className="h-4 w-4" />
          <span>Find Friends</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="social-gradient bg-clip-text text-transparent">Find Friends</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <Input 
            placeholder="Search by name or @username..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 focus-visible:ring-social-dark-green"
          />
          <Button 
            type="submit" 
            disabled={isSearching || !searchTerm.trim()} 
            className="bg-social-dark-green hover:bg-social-forest-green text-white"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
          {results.length > 0 ? (
            results.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg animate-fade-in">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => viewProfile(user.id)}>
                  <Avatar>
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} />
                    ) : (
                      <AvatarFallback className="bg-social-dark-green text-white">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => viewProfile(user.id)}
                    className="hover-scale"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => sendFriendRequest(user.id)}
                    disabled={requestInProgress[user.id]}
                    className="bg-social-dark-green hover:bg-social-forest-green text-white"
                  >
                    {requestInProgress[user.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          ) : isSearching ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-social-dark-green mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Searching...</p>
            </div>
          ) : searchTerm ? (
            <Card className="p-6 text-center">
              <p>No users found matching "{searchTerm}"</p>
              <p className="text-sm text-muted-foreground mt-2">Try a different search term or invite friends to join!</p>
            </Card>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
