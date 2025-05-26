
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useNotifications } from "@/hooks/use-notifications";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Friends from "./pages/Friends";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Components
import { AuthGuard } from "./components/common/AuthGuard";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { setupAllNotifications } = useNotifications();
  
  // Set favicon and handle notifications
  useEffect(() => {
    const faviconLink = document.querySelector("link[rel*='icon']") || document.createElement('link');
    faviconLink.setAttribute('rel', 'shortcut icon');
    faviconLink.setAttribute('href', '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png');
    document.head.appendChild(faviconLink);
    
    document.title = "SocialChat - Connect with Friends";
    
    // Set up notifications when session changes and user is authenticated
    let cleanupNotifications: (() => void) | undefined;
    
    if (session) {
      cleanupNotifications = setupAllNotifications(session.user.id);
    }
    
    return () => {
      if (cleanupNotifications) {
        cleanupNotifications();
      }
    };
  }, [session, setupAllNotifications]);
  
  useEffect(() => {
    // Set up the auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Handle auth events
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setLoading(false);
          // Clear any cached data
          localStorage.clear();
          sessionStorage.clear();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          setSession(session);
          setLoading(false);
        } else {
          setSession(session);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      setLoading(false);
    });

    // Setup push notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-social-light-green to-social-blue">
        <div className="text-center">
          <img 
            src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
            alt="SocialChat Logo" 
            className="h-20 w-auto mx-auto animate-pulse mb-4" 
          />
          <p className="font-pixelated text-white text-sm">Loading SocialChat...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes - redirect to dashboard if authenticated */}
            <Route 
              path="/" 
              element={session ? <Navigate to="/dashboard" replace /> : <Index />} 
            />
            <Route 
              path="/login" 
              element={session ? <Navigate to="/dashboard" replace /> : <Login />} 
            />
            <Route 
              path="/register" 
              element={session ? <Navigate to="/dashboard" replace /> : <Register />} 
            />
            
            {/* Protected Routes - redirect to login if not authenticated */}
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              } 
            />
            <Route 
              path="/friends" 
              element={
                <AuthGuard>
                  <Friends />
                </AuthGuard>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <AuthGuard>
                  <Messages />
                </AuthGuard>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <AuthGuard>
                  <Notifications />
                </AuthGuard>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <AuthGuard>
                  <Profile />
                </AuthGuard>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <AuthGuard>
                  <Settings />
                </AuthGuard>
              } 
            />
            
            {/* Catch-all route for 404 - improved */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
