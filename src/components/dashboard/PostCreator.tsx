import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Send, X, Globe, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function PostCreator() {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const { toast } = useToast();

  React.useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUser(profile);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select an image file',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select an image smaller than 5MB',
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    // Reset the file input
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile) {
      toast({
        variant: 'destructive',
        title: 'Empty post',
        description: 'Please add some content or an image',
      });
      return;
    }
    
    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please log in to create a post',
      });
      return;
    }

    setIsPosting(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
        const filePath = fileName;

        console.log('Uploading image to:', filePath);

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
        console.log('Image uploaded successfully:', imageUrl);
      }

      // Create post with visibility
      const { error } = await supabase
        .from('posts')
        .insert({
          content: content.trim(),
          image_url: imageUrl,
          user_id: currentUser.id,
          visibility: visibility
        });

      if (error) {
        console.error('Post creation error:', error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      // Reset form
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setVisibility('public');
      
      // Reset file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      toast({
        title: 'Post created!',
        description: `Your ${visibility} post has been shared`,
      });

      // Emit custom event for feed refresh
      window.dispatchEvent(new CustomEvent('postCreated'));

    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create post',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="w-full border-border mb-4">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            {currentUser?.avatar ? (
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            ) : (
              <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-sm">
                {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-pixelated text-sm resize-none border-0 focus-visible:ring-0 p-0 min-h-[60px]"
            />
            
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full rounded-lg object-cover max-h-64"
                />
                <Button
                  onClick={handleRemoveImage}
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-pixelated text-xs text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <span className="cursor-pointer">
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Photo
                    </span>
                  </Button>
                </label>
                
                {/* Visibility Selector */}
                <Select value={visibility} onValueChange={(value: 'public' | 'friends') => setVisibility(value)}>
                  <SelectTrigger className="w-auto h-8 font-pixelated text-xs border-none bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public" className="font-pixelated text-xs">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Public
                      </div>
                    </SelectItem>
                    <SelectItem value="friends" className="font-pixelated text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Friends Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handlePost}
                disabled={(!content.trim() && !imageFile) || isPosting}
                size="sm"
                className="font-pixelated text-xs bg-social-green hover:bg-social-light-green"
              >
                {isPosting ? (
                  'Posting...'
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}