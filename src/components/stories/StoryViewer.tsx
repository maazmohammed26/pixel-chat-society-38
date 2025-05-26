
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Story {
  id: string;
  user_id: string;
  image_url: string;
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
}

export function StoryViewer({ story, onClose, currentUserId }: StoryViewerProps) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / 120); // 12 seconds = 120 intervals of 100ms
        if (newProgress >= 100) {
          onClose();
          return 100;
        }
        return newProgress;
      });

      setTimeLeft((prev) => {
        const newTime = prev - 0.1;
        if (newTime <= 0) {
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [onClose]);

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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto p-0 bg-black border-none overflow-hidden">
        <div className="relative w-full h-[600px] flex flex-col">
          {/* Progress Bar */}
          <div className="absolute top-2 left-2 right-2 z-10">
            <div className="w-full h-1 bg-white/30 rounded-full">
              <div 
                className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
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
            <Button
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Story Image */}
          <div className="flex-1 flex items-center justify-center">
            <img
              src={story.image_url}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Footer */}
          {story.user_id === currentUserId && (
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
