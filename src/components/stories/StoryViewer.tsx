
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Eye, ChevronLeft, ChevronRight, Trash2, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  photo_urls: string[] | null;
  photo_metadata: any[] | null;
  created_at: string;
  expires_at: string;
  views_count: number;
  profiles: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

interface StoryViewerProps {
  story: Story;
  onClose: () => void;
  currentUserId: string;
  onStoryUpdated: () => void;
}

export function StoryViewer({ story, onClose, currentUserId, onStoryUpdated }: StoryViewerProps) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const photos = story.photo_urls && story.photo_urls.length > 0 
    ? story.photo_urls 
    : story.image_url 
    ? [story.image_url] 
    : [];

  const totalPhotos = photos.length;
  const isOwnStory = story.user_id === currentUserId;

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (100 / 120);
          if (newProgress >= 100) {
            if (currentPhotoIndex < totalPhotos - 1) {
              setCurrentPhotoIndex(prev => prev + 1);
              setProgress(0);
              setTimeLeft(12);
              return 0;
            } else {
              onClose();
              return 100;
            }
          }
          return newProgress;
        });

        setTimeLeft((prev) => {
          const newTime = prev - 0.1;
          if (newTime <= 0) {
            return 12;
          }
          return newTime;
        });
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, onClose, currentPhotoIndex, totalPhotos]);

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      return `${diffInHours}h ago`;
    }
  };

  const goToPreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
      setProgress(0);
      setTimeLeft(12);
    }
  };

  const goToNextPhoto = () => {
    if (currentPhotoIndex < totalPhotos - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
      setProgress(0);
      setTimeLeft(12);
    } else {
      onClose();
    }
  };

  const handleLongPressStart = () => {
    longPressRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
  };

  const handleLongPressEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
    }
    setIsPaused(false);
  };

  const handleDeletePhoto = async () => {
    try {
      const { error } = await supabase.rpc('delete_story_photos', {
        story_id: story.id,
        photo_indices: [currentPhotoIndex]
      });

      if (error) throw error;

      toast({
        title: 'Photo deleted',
        description: 'The photo has been removed from your story',
      });

      onStoryUpdated();
      
      if (totalPhotos === 1) {
        onClose();
      } else if (currentPhotoIndex >= totalPhotos - 1) {
        setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1));
      }
      
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete photo',
      });
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-sm mx-auto p-0 bg-black border-none overflow-hidden">
          <div className="relative w-full h-[600px] flex flex-col">
            {/* Progress Bars */}
            <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
              {photos.map((_, index) => (
                <div key={index} className="flex-1 h-1 bg-white/30 rounded-full">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                    style={{ 
                      width: index < currentPhotoIndex ? '100%' : 
                             index === currentPhotoIndex ? `${progress}%` : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-2 right-2 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8 border border-white">
                  {story.profiles.avatar ? (
                    <AvatarImage src={story.profiles.avatar} alt={story.profiles.name} />
                  ) : (
                    <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                      {story.profiles.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-white font-pixelated text-xs">
                    {story.profiles.name}
                  </p>
                  <p className="text-white/70 font-pixelated text-xs">
                    {timeAgo(story.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOwnStory && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/20 h-6 w-6"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black/90 border-white/20">
                      <DropdownMenuItem
                        onClick={() => setShowDeleteConfirmation(true)}
                        className="font-pixelated text-destructive hover:bg-white/10"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete This Photo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  onClick={onClose}
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Navigation Areas */}
            <div className="absolute inset-0 flex">
              <div 
                className="flex-1 cursor-pointer z-10"
                onClick={goToPreviousPhoto}
                style={{ display: currentPhotoIndex > 0 ? 'block' : 'none' }}
              />
              <div 
                className="flex-1 cursor-pointer z-10"
                onClick={goToNextPhoto}
              />
            </div>

            {/* Story Image with Long Press */}
            <div 
              className="flex-1 flex items-center justify-center"
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
            >
              <img
                src={photos[currentPhotoIndex]}
                alt="Story"
                className="max-w-full max-h-full object-contain"
              />
              {isPaused && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="text-white font-pixelated text-sm bg-black/50 px-3 py-1 rounded-full">
                    Paused
                  </div>
                </div>
              )}
            </div>

            {/* Photo Counter */}
            {totalPhotos > 1 && (
              <div className="absolute bottom-12 left-2 right-2 z-10">
                <div className="flex items-center justify-center">
                  <span className="text-white/80 font-pixelated text-xs bg-black/30 px-2 py-1 rounded-full">
                    {currentPhotoIndex + 1} / {totalPhotos}
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            {isOwnStory && (
              <div className="absolute bottom-2 left-2 right-2 z-10">
                <div className="flex items-center justify-center gap-1 text-white/80">
                  <Eye className="h-3 w-3" />
                  <span className="font-pixelated text-xs">
                    {story.views_count} {story.views_count === 1 ? 'view' : 'views'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Delete Photo</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated">
              Are you sure you want to delete this photo from your story? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePhoto}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
