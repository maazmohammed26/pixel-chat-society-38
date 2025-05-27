import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, X, Image as ImageIcon, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded: () => void;
  currentUser: any;
  existingStory?: any;
}

export function AddStoryDialog({ open, onOpenChange, onStoryAdded, currentUser, existingStory }: AddStoryDialogProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const hasExistingPhotos = existingStory?.photo_urls?.length > 0;
  const existingPhotosCount = hasExistingPhotos ? existingStory.photo_urls.length : 0;
  const totalPhotosAfterUpload = existingPhotosCount + selectedImages.length;

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate total number of images (max 10)
    if (totalPhotosAfterUpload + files.length > 10) {
      toast({
        variant: 'destructive',
        title: 'Too many photos',
        description: `You can add up to 10 photos per story. You currently have ${existingPhotosCount} photos.`,
      });
      return;
    }

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select only image files',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select images smaller than 10MB each',
        });
        return;
      }

      validFiles.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0 || !currentUser) return;

    try {
      setUploading(true);

      const uploadedUrls: string[] = [];
      const photoMetadata: any[] = [];
      const currentTime = new Date().toISOString();

      // Upload all images
      for (const image of selectedImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        uploadedUrls.push(data.publicUrl);
        photoMetadata.push({
          uploaded_at: currentTime,
          file_name: fileName
        });
      }

      // Add photos to existing story or create new one
      if (hasExistingPhotos) {
        const { error } = await supabase.rpc('add_photos_to_story', {
          story_user_id: currentUser.id,
          new_photo_urls: uploadedUrls,
          new_photo_metadata: photoMetadata
        });

        if (error) throw error;

        toast({
          title: 'Photos added!',
          description: `Added ${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} to your story`,
        });
      } else {
        // Create new story
        const { error: insertError } = await supabase
          .from('stories')
          .insert({
            user_id: currentUser.id,
            photo_urls: uploadedUrls,
            photo_metadata: photoMetadata,
            image_url: uploadedUrls[0],
          });

        if (insertError) throw insertError;

        toast({
          title: 'Story posted!',
          description: `Your story with ${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} has been shared`,
        });
      }

      resetForm();
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
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviewUrls([]);
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
      <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
            {hasExistingPhotos ? 'Add More Photos' : 'Add to Your Story'}
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

          {/* Existing Photos Preview */}
          {hasExistingPhotos && (
            <div className="space-y-2">
              <p className="font-pixelated text-xs text-muted-foreground">
                Current story ({existingPhotosCount} photo{existingPhotosCount > 1 ? 's' : ''})
              </p>
              <div className="grid grid-cols-3 gap-1 max-h-24 overflow-y-auto">
                {existingStory.photo_urls.slice(0, 6).map((url: string, index: number) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Existing ${index + 1}`}
                    className="w-full h-16 object-cover rounded"
                  />
                ))}
                {existingPhotosCount > 6 && (
                  <div className="w-full h-16 bg-muted rounded flex items-center justify-center">
                    <span className="font-pixelated text-xs text-muted-foreground">
                      +{existingPhotosCount - 6}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Image Previews */}
          {previewUrls.length > 0 ? (
            <div className="space-y-3">
              <p className="font-pixelated text-xs text-muted-foreground">
                New photos to add ({selectedImages.length})
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`New photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      onClick={() => removeImage(index)}
                      size="icon"
                      variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6 bg-black/50 text-white hover:bg-black/70"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {totalPhotosAfterUpload < 10 && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full font-pixelated text-xs h-8"
                  disabled={uploading}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add More ({totalPhotosAfterUpload}/10)
                </Button>
              )}
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
                  {hasExistingPhotos ? 'Add more photos' : 'Tap to add photos'}
                </p>
                <p className="font-pixelated text-xs text-muted-foreground">
                  {hasExistingPhotos 
                    ? `${10 - existingPhotosCount} photos remaining`
                    : 'Up to 10 photos, max 10MB each'
                  }
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            {selectedImages.length > 0 ? (
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
                  {uploading ? 'Adding...' : 
                   hasExistingPhotos ? `Add ${selectedImages.length} Photo${selectedImages.length > 1 ? 's' : ''}` :
                   `Share Story (${selectedImages.length})`
                  }
                </Button>
              </>
            ) : (
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
              >
                <Camera className="h-3 w-3 mr-1" />
                {hasExistingPhotos ? 'Add More Photos' : 'Choose Photos'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
