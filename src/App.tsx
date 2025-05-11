
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";

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
  
  // Set favicon
  useEffect(() => {
    const faviconLink = document.querySelector("link[rel*='icon']") || document.createElement('link');
    faviconLink.setAttribute('rel', 'shortcut icon');
    faviconLink.setAttribute('href', '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png');
    document.head.appendChild(faviconLink);
    
    // Show development notification
    if (session) {
      setTimeout(() => {
        toast.info(
          "App is under development",
          {
            description: "Developed by Mohammed Maaz A. Thank you for using my project!",
            duration: 5000,
          }
        );
      }, 1500);
    }
  }, [session]);
  
  useEffect(() => {
    // Set up the auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Setup push notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        Notification.requestPermission();
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
      <div className="flex items-center justify-center min-h-screen">
        <img src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" alt="SocialChat Logo" className="h-16 w-auto animate-pulse" />
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
            {/* Public Routes */}
            <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Index />} />
            <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
            <Route path="/register" element={session ? <Navigate to="/dashboard" /> : <Register />} />
            
            {/* Protected Routes */}
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
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
