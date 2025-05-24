
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
import { Button } from '@/components/ui/button';
import { Info, Home } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function Dashboard() {
  const [showWelcome, setShowWelcome] = useState(false);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)]">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            <h1 className="font-pixelated text-sm">Home</h1>
          </div>
          <Button
            onClick={() => setShowWelcome(true)}
            size="icon"
            className="h-6 w-6 rounded-full bg-social-blue hover:bg-social-blue/90 text-white"
          >
            <Info className="h-3 w-3" />
          </Button>
        </div>

        {/* Welcome Dialog */}
        <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
                Welcome to PixelChat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Share your thoughts, connect with friends, and join the community conversation.
              </p>
              <p className="font-pixelated text-xs text-muted-foreground leading-relaxed">
                Get started by posting in the community feed or by exploring suggested friends.
              </p>
              <Button 
                onClick={() => setShowWelcome(false)}
                className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6"
              >
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Content */}
        <div className="h-[calc(100vh-120px)] overflow-y-auto p-2">
          <CommunityFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
