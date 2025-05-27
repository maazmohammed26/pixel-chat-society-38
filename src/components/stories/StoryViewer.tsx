
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Eye, Pause, Play, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  photo_urls: string[] | null;
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
  onStoryDeleted?: () => void;
  currentUserId: string;
}

export function StoryViewer({ story, onClose, onStoryDeleted, currentUserId }: StoryViewerProps) {
  const [progress, setProgress] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const photos = story.photo_urls && story.photo_urls.length > 0 
    ? story.photo_urls 
    : story.image_url 
    ? [story.image_url] 
    : [];

  const totalPhotos = photos.length;
  const isOwner = story.user_id === currentUserId;

  useEffect(() => {
    if (isPaused || totalPhotos === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / 120);
        if (newProgress >= 100) {
          if (currentPhotoIndex < totalPhotos - 1) {
            setCurrentPhotoIndex(prev => prev + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return newProgress;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, currentPhotoIndex, totalPhotos, onClose]);

  useEffect(() => {
    setProgress(0);
  }, [currentPhotoIndex]);

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

  const goToPreviousPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const goToNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPhotoIndex < totalPhotos - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused(prev => !prev);
  };

  const handleDeleteStory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner || isDeleting) return;

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', story.id);

      if (error) throw error;

      toast({
        title: 'Story deleted',
        description: 'Your story has been deleted successfully',
      });

      onClose();
      onStoryDeleted?.();
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete story. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
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
              {/* Pause/Play Button */}
              <Button
                onClick={togglePause}
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 h-6 w-6 z-20"
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </Button>

              {/* Delete Button (only for story owner) */}
              {isOwner && (
                <Button
                  onClick={handleDeleteStory}
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-red-500/20 h-6 w-6 z-20"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}

              {/* Close Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 h-6 w-6 z-20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Navigation Areas */}
          <div className="absolute inset-0 flex z-10">
            <div 
              className="flex-1 cursor-pointer"
              onClick={goToPreviousPhoto}
              style={{ display: currentPhotoIndex > 0 ? 'block' : 'none' }}
            />
            <div 
              className="flex-1 cursor-pointer"
              onClick={goToNextPhoto}
            />
          </div>

          {/* Story Image */}
          <div className="flex-1 flex items-center justify-center">
            <img
              src={photos[currentPhotoIndex]}
              alt="Story"
              className="max-w-full max-h-full object-contain"
              loading="eager"
            />
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
          {isOwner && (
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
  );
}
