
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-social-purple/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-social-blue/20 blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md z-10 animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">PixelChat</h1>
          <p className="text-muted-foreground">Connect, Share, Chat</p>
        </div>
        
        <Card className="border-0 shadow-lg glass-card">
          <CardContent className="p-6 sm:p-8">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AuthLayout;
