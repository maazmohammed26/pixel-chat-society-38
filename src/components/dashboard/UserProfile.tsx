
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, AtSign, Camera, Edit2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { getUserProfile, updateUserProfile } from '@/utils/authUtils';

export function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    id: '',
    name: '',
    username: '',
    email: '',
    avatar: '',
    bio: '',
    friendCount: 0,
    postCount: 0
  });
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const profileData = await getUserProfile(user.id);
          
          // Get friend count
          const { count: friendCount } = await supabase
            .from('friends')
            .select('*', { count: 'exact', head: true })
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .eq('status', 'accepted');
            
          // Get post count
          const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
          setProfile({
            id: user.id,
            name: profileData.name || '',
            username: profileData.username || '',
            email: profileData.email || '',
            avatar: profileData.avatar || '',
            bio: profileData.bio || '',
            friendCount: friendCount || 0,
            postCount: postCount || 0
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load profile data',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [toast]);
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleSave = async () => {
    try {
      await updateUserProfile(profile.id, {
        name: profile.name,
        bio: profile.bio,
        updated_at: new Date()
      });
      
      setIsEditing(false);
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Failed to update profile. Please try again.',
      });
    }
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    // Reset any changes
    setProfile(prev => ({
      ...prev
    }));
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-muted"></div>
          <div className="h-7 bg-muted rounded mx-auto w-1/3 mt-4"></div>
          <div className="h-5 bg-muted rounded mx-auto w-1/4 mt-2"></div>
        </CardHeader>
        <CardContent>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="h-6 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded"></div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="h-5 bg-muted rounded"></div>
            <div className="h-5 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="text-center pb-0">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={profile.avatar} alt={profile.name} />
            <AvatarFallback className="text-2xl">{profile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0">
            <Button size="icon" variant="secondary" className="rounded-full w-8 h-8">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring mt-1">
                <User className="ml-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="name"
                  name="name"
                  placeholder="Your name" 
                  className="border-0 bg-transparent focus-visible:ring-0" 
                  value={profile.name}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="bio">Bio</Label>
              <div className="flex items-center border rounded-md bg-muted/40 focus-within:ring-1 focus-within:ring-ring mt-1">
                <Input 
                  id="bio"
                  name="bio"
                  placeholder="Tell us about yourself" 
                  className="border-0 bg-transparent focus-visible:ring-0" 
                  value={profile.bio}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button className="btn-gradient" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              {profile.name}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEdit}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </CardTitle>
            <div className="text-sm text-muted-foreground">@{profile.username}</div>
            
            {profile.bio && (
              <p className="mt-2 text-sm">{profile.bio}</p>
            )}
          </>
        )}
      </CardHeader>
      
      <CardContent className="pt-4">
        <Separator className="my-4" />
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold">{profile.friendCount}</p>
            <p className="text-sm text-muted-foreground">Friends</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{profile.postCount}</p>
            <p className="text-sm text-muted-foreground">Posts</p>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{profile.email}</span>
          </div>
          <div className="flex items-center text-sm">
            <AtSign className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>@{profile.username}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserProfile;
