
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MessageCircle, User, Users, Heart } from 'lucide-react';

export function Index() {
  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Redirect to dashboard if already logged in
      window.location.href = '/dashboard';
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b py-4 px-6 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold social-gradient bg-clip-text text-transparent">PixelChat</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/register">
              <Button className="btn-gradient">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="flex-1 py-20 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Connect. Share. <span className="social-gradient bg-clip-text text-transparent">Engage.</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Join our vibrant social community where you can connect with friends, 
                share your thoughts, and engage in meaningful conversations.
              </p>
              <div className="flex gap-4 pt-4">
                <Link to="/register">
                  <Button size="lg" className="btn-gradient hover-scale">
                    Get Started
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="hover-scale">
                    I already have an account
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -z-10 inset-0 bg-social-purple/20 blur-3xl rounded-full"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-10">
                  <div className="rounded-lg bg-white shadow-lg p-6 glass-card animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="text-social-blue" />
                      <h3 className="font-semibold">Instant Messaging</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chat with friends and create group conversations in real-time.
                    </p>
                  </div>
                  <div className="rounded-lg bg-white shadow-lg p-6 glass-card animate-fade-in" style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="text-social-purple" />
                      <h3 className="font-semibold">Personal Profiles</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Create your unique identity and share your interests.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg bg-white shadow-lg p-6 glass-card animate-fade-in" style={{animationDelay: '0.1s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="text-social-magenta" />
                      <h3 className="font-semibold">Community Posts</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share thoughts and engage with content from others.
                    </p>
                  </div>
                  <div className="rounded-lg bg-white shadow-lg p-6 glass-card animate-fade-in" style={{animationDelay: '0.3s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="text-social-green" />
                      <h3 className="font-semibold">Friend Networks</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Build your personal network through connections.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t py-8 bg-background">
        <div className="container mx-auto px-6 text-sm text-muted-foreground text-center">
          <p>© 2025 PixelChat Social Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Index;
