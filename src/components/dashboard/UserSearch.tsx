
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;
      
      // Search profiles by name or username
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .neq('id', currentUser.user.id)
        .limit(10);
        
      if (error) throw error;
      
      // Filter out existing friends or pending requests
      const { data: connections } = await supabase
        .from('friends')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${currentUser.user.id},receiver_id.eq.${currentUser.user.id}`);
      
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
        description: 'Failed to search for users',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const sendFriendRequest = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Send friend request
      await supabase
        .from('friends')
        .insert([
          { sender_id: user.id, receiver_id: userId, status: 'pending' }
        ]);
      
      // Update results to remove user
      setResults(prevResults => prevResults.filter(u => u.id !== userId));
      
      toast({
        title: 'Friend request sent',
        description: 'Your request was sent successfully',
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send friend request',
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          <span>Find Friends</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find Friends</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <Input 
            placeholder="Search by name or username..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || !searchTerm.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </form>
        
        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
          {results.length > 0 ? (
            results.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendFriendRequest(user.id)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            ))
          ) : isSearching ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Searching...</p>
            </div>
          ) : searchTerm ? (
            <Card className="p-6 text-center">
              <p>No users found matching "{searchTerm}"</p>
            </Card>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
