
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { FriendList } from '@/components/dashboard/FriendList';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function Friends() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative">
        {/* Info Button */}
        <div className="fixed top-20 right-4 z-40 sm:absolute sm:top-2 sm:right-2">
          <Button
            onClick={() => setShowInfo(true)}
            size="icon"
            className="h-8 w-8 rounded-full bg-social-blue hover:bg-social-blue/90 text-white shadow-lg"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Info Dialog */}
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
                Friends & Network
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Manage your network, send requests, and create group chats.
              </p>
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Building your network is easy! Send requests to suggested users or search for friends.
              </p>
              <Button 
                onClick={() => setShowInfo(false)}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="h-[calc(100vh-140px)] overflow-y-auto">
          <div className="pb-4">
            <FriendList />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Friends;
