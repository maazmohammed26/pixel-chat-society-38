
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Edit, Save, X, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  created_at: string;
  updated_at: string;
}

export default function UserProfile() {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (data) {
        setUser(data);
        setEditForm({
          name: data.name || '',
          username: data.username || '',
          bio: '' // Remove bio field since it doesn't exist
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          username: editForm.username,
        })
        .eq('id', authUser.id);

      if (error) throw error;

      await fetchUserProfile();
      setIsEditing(false);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="animate-pulse">
          <CardHeader className="text-center">
            <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-4"></div>
            <div className="h-6 w-32 bg-muted rounded mx-auto mb-2"></div>
            <div className="h-4 w-24 bg-muted rounded mx-auto"></div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p className="text-muted-foreground font-pixelated text-sm">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-3">
      <Card className="card-gradient">
        <CardHeader className="text-center pb-4">
          <div className="relative inline-block">
            <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-social-green">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : (
                <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-lg">
                  {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <Button
              size="icon"
              variant="outline"
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-social-green hover:bg-social-green hover:text-white"
              disabled
            >
              <Camera className="h-3 w-3" />
            </Button>
          </div>
          
          {!isEditing ? (
            <>
              <CardTitle className="font-pixelated text-lg text-foreground mb-1">
                {user.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground font-pixelated mb-2">
                @{user.username}
              </p>
              <p className="text-xs text-muted-foreground font-pixelated mb-4">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit Profile
              </Button>
            </>
          ) : (
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-pixelated">Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="font-pixelated text-xs h-8"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="username" className="text-xs font-pixelated">Username</Label>
                <Input
                  id="username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="font-pixelated text-xs h-8"
                />
              </div>
              
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  onClick={handleSave}
                  className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="font-pixelated text-xs h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Stats Card */}
      <Card className="card-gradient">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-pixelated text-social-green">0</p>
              <p className="text-xs text-muted-foreground font-pixelated">Posts</p>
            </div>
            <div>
              <p className="text-lg font-pixelated text-social-green">0</p>
              <p className="text-xs text-muted-foreground font-pixelated">Friends</p>
            </div>
            <div>
              <p className="text-lg font-pixelated text-social-green">0</p>
              <p className="text-xs text-muted-foreground font-pixelated">Likes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Copyright */}
      <Card className="card-gradient">
        <CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground font-pixelated flex items-center justify-center gap-1">
            Developed by Mohammed Maaz with <Heart className="h-3 w-3 text-red-500" fill="currentColor" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
