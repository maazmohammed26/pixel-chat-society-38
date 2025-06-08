import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';

interface ProfilePictureViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
}

export function ProfilePictureViewer({ open, onOpenChange, user }: ProfilePictureViewerProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-auto p-0 bg-black border-none overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative w-full h-[500px] flex flex-col">
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-white">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : (
                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                    {user.name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="text-white font-pixelated text-sm">
                  {user.name}
                </p>
                <p className="text-white/70 font-pixelated text-xs">
                  @{user.username}
                </p>
              </div>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Profile Picture */}
          <div className="flex-1 flex items-center justify-center p-4">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.name}'s profile picture`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 rounded-full bg-social-dark-green flex items-center justify-center">
                <span className="text-white font-pixelated text-4xl">
                  {user.name?.substring(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}