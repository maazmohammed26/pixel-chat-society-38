
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, AtSign, Camera, Edit2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface UserProfileProps {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatar: string;
    bio?: string;
    friendCount: number;
    postCount: number;
  };
}

export function UserProfile({ user }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: user.name,
    bio: user.bio || '',
  });
  const { toast } = useToast();
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: 'Profile updated',
      description: 'Your profile has been successfully updated.',
    });
    
    // In a real app, we would make an API call here
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setProfile({
      name: user.name,
      bio: user.bio || '',
    });
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="text-center pb-0">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-2xl">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
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
            <div className="text-sm text-muted-foreground">@{user.username}</div>
            
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
            <p className="text-2xl font-semibold">{user.friendCount}</p>
            <p className="text-sm text-muted-foreground">Friends</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{user.postCount}</p>
            <p className="text-sm text-muted-foreground">Posts</p>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center text-sm">
            <AtSign className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>@{user.username}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Default export with mock data
export default function UserProfileSection() {
  // This would normally come from context or API
  const mockUser = {
    id: '1',
    name: 'Demo User',
    username: 'demo',
    email: 'demo@example.com',
    avatar: 'https://i.pravatar.cc/150?u=demo',
    bio: 'Software engineer and tech enthusiast',
    friendCount: 42,
    postCount: 18,
  };
  
  return <UserProfile user={mockUser} />;
}
