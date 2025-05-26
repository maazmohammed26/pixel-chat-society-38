
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded: () => void;
  currentUser: any;
}

export function AddStoryDialog({ open, onOpenChange, onStoryAdded, currentUser }: AddStoryDialogProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please select an image file',
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select an image smaller than 10MB',
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedImage || !currentUser) return;

    try {
      setUploading(true);

      // Upload image to Supabase Storage
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, selectedImage);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      // Save story to database
      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: currentUser.id,
          image_url: data.publicUrl,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Story posted!',
        description: 'Your story has been shared successfully',
      });

      // Reset form and close dialog
      setSelectedImage(null);
      setPreviewUrl(null);
      onOpenChange(false);
      onStoryAdded();

    } catch (error) {
      console.error('Error uploading story:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to post your story. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
            Add to Your Story
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              {currentUser?.avatar ? (
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              ) : (
                <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                  {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="font-pixelated text-xs">{currentUser?.name}</span>
          </div>

          {/* Image Preview or Upload Area */}
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Story preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                onClick={resetForm}
                size="icon"
                variant="ghost"
                className="absolute top-1 right-1 h-6 w-6 bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-social-green rounded-lg p-8 text-center cursor-pointer hover:border-social-light-green transition-colors"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-social-green/10 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-social-green" />
                </div>
                <p className="font-pixelated text-xs text-muted-foreground">
                  Tap to add a photo
                </p>
                <p className="font-pixelated text-xs text-muted-foreground">
                  Max 10MB
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            {selectedImage ? (
              <>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 font-pixelated text-xs h-8"
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  className="flex-1 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
                  disabled={uploading}
                >
                  {uploading ? 'Posting...' : 'Share Story'}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
              >
                <Camera className="h-3 w-3 mr-1" />
                Choose Photo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
