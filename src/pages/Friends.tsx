
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { FriendList } from '@/components/dashboard/FriendList';
import { Button } from '@/components/ui/button';
import { Info, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function Friends() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-full flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-background shrink-0 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="font-pixelated text-base">Friends</h1>
          </div>
          <Button
            onClick={() => setShowInfo(true)}
            size="icon"
            className="h-7 w-7 rounded-full bg-social-blue hover:bg-social-blue/90 text-white hover-scale"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Info Dialog */}
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogContent className="max-w-sm mx-auto animate-in zoom-in-95 duration-200">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
                Friends & Network
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Manage your network, send requests, and create group chats.
              </p>
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Building your network is easy! Send requests to suggested users or search for friends.
              </p>
              <Button 
                onClick={() => setShowInfo(false)}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6 hover-scale"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Content with hidden scrollbar */}
        <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="p-3">
            <FriendList />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Friends;
