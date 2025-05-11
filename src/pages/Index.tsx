
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
            <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-8 w-auto" />
            <span className="text-xl font-bold font-pixelated social-gradient bg-clip-text text-transparent">SocialChat</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="font-pixelated">Log in</Button>
            </Link>
            <Link to="/register">
              <Button className="btn-gradient font-pixelated">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="flex-1 py-20 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6 animate-fade-in">
              <div className="mb-4">
                <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-16 w-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight font-pixelated">
                Connect. Share. <span className="social-gradient bg-clip-text text-transparent">Engage.</span>
              </h1>
              <p className="text-xl text-muted-foreground font-pixelated">
                Join our vibrant social community where you can connect with friends, 
                share your thoughts, and engage in meaningful conversations.
              </p>
              <div className="flex gap-4 pt-4">
                <Link to="/register">
                  <Button size="lg" className="btn-gradient hover-scale font-pixelated">
                    Get Started
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="hover-scale font-pixelated">
                    I already have an account
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -z-10 inset-0 bg-social-green/20 blur-3xl rounded-full"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-10">
                  <div className="rounded-lg bg-white shadow-lg p-6 glass-card animate-fade-in pixel-border pixel-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="text-social-green" />
                      <h3 className="font-semibold font-pixelated">Instant Messaging</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-pixelated">
                      Chat with friends in real-time.
                    </p>
                  </div>
                  <div className="rounded-lg bg-white shadow-lg p-6 glass-card animate-fade-in pixel-border pixel-shadow" style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="text-social-purple" />
                      <h3 className="font-semibold font-pixelated">Personal Profiles</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-pixelated">
                      Create your unique identity.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg bg-white shadow-lg p-6 glass-card animate-fade-in pixel-border pixel-shadow" style={{animationDelay: '0.1s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="text-social-magenta" />
                      <h3 className="font-semibold font-pixelated">Community Posts</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-pixelated">
                      Share thoughts and engage.
                    </p>
                  </div>
                  <div className="rounded-lg bg-white shadow-lg p-6 glass-card animate-fade-in pixel-border pixel-shadow" style={{animationDelay: '0.3s'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="text-social-green" />
                      <h3 className="font-semibold font-pixelated">Friend Networks</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-pixelated">
                      Build your personal network.
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
          <div className="flex flex-col items-center justify-center space-y-2">
            <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-8 w-auto mb-2" />
            <p className="font-pixelated">© 2025 SocialChat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Index;
