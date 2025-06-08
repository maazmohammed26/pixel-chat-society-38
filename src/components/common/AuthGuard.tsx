import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getInitialSession();

    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setLoading(false);
        
        // Save session state to localStorage for persistence
        if (session) {
          localStorage.setItem('supabase-session', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user_id: session.user.id
          }));
        } else {
          // Only clear session data, preserve theme
          const theme = localStorage.getItem('socialchat-theme');
          localStorage.removeItem('supabase-session');
          if (theme) {
            localStorage.setItem('socialchat-theme', theme);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-social-blue"></div>
      </div>
    );
  }

  if (!session) {
    // Redirect to login if not authenticated, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default AuthGuard;