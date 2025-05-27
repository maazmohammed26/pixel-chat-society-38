
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, User, Calendar, Mail } from 'lucide-react';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    email?: string;
    created_at?: string;
  } | null;
}

export function UserProfileDialog({ open, onOpenChange, user }: UserProfileDialogProps) {
  if (!user) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden">
        <div className="relative">
          {/* Close button */}
          <Button
            onClick={() => onOpenChange(false)}
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 z-10 text-gray-600 hover:bg-gray-100 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Profile Picture - Large View */}
          <div className="w-full h-80 bg-gradient-to-br from-social-light-green to-social-blue flex items-center justify-center">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-48 h-48 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-social-dark-green flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-white font-pixelated text-4xl">
                  {user.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="p-6 bg-background">
            <div className="text-center mb-4">
              <h2 className="font-pixelated text-lg text-foreground mb-1">
                {user.name}
              </h2>
              <p className="text-sm text-muted-foreground font-pixelated">
                @{user.username}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-4 w-4 text-social-green" />
                <div>
                  <p className="font-pixelated text-xs text-muted-foreground">Full Name</p>
                  <p className="font-pixelated text-sm text-foreground">{user.name}</p>
                </div>
              </div>

              {user.email && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-4 w-4 text-social-blue" />
                  <div>
                    <p className="font-pixelated text-xs text-muted-foreground">Email</p>
                    <p className="font-pixelated text-sm text-foreground">{user.email}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-4 w-4 text-social-purple" />
                <div>
                  <p className="font-pixelated text-xs text-muted-foreground">Joined</p>
                  <p className="font-pixelated text-sm text-foreground">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
