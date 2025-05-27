
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X } from 'lucide-react';

interface ProfilePictureDialogProps {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export function ProfilePictureDialog({ user, isOpen, onClose, currentUserId }: ProfilePictureDialogProps) {
  const [showConfirm, setShowConfirm] = useState(true);
  const [showImage, setShowImage] = useState(false);

  if (!user) return null;

  const isOwnProfile = user.id === currentUserId;

  const handleConfirm = () => {
    setShowConfirm(false);
    setShowImage(true);
  };

  const handleClose = () => {
    setShowConfirm(true);
    setShowImage(false);
    onClose();
  };

  if (showImage || isOwnProfile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg mx-auto p-0 bg-black border-none overflow-hidden">
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
                <p className="text-white font-pixelated text-sm">
                  {user.name}
                </p>
              </div>
              <Button
                onClick={handleClose}
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

  if (showConfirm && !isOwnProfile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
              View Profile Picture
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : (
                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                    {user.name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-pixelated text-sm">{user.name}</p>
                <p className="font-pixelated text-xs text-muted-foreground">
                  Would you like to view this user's profile picture?
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 font-pixelated text-xs h-8"
              >
                No
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
              >
                Yes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
