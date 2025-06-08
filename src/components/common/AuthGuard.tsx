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
    let mounted = true;

    // Function to check and restore session
    const checkSession = async () => {
      try {
        // First check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(currentSession);
          setLoading(false);
        }

        // If no session, try to restore from localStorage
        if (!currentSession) {
          const savedSession = localStorage.getItem('supabase-session');
          if (savedSession) {
            try {
              const sessionData = JSON.parse(savedSession);
              // Validate session data
              if (sessionData.access_token && sessionData.refresh_token) {
                // Try to refresh the session
                const { data: { session: refreshedSession }, error } = await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token
                });

                if (!error && refreshedSession && mounted) {
                  setSession(refreshedSession);
                } else {
                  // Clear invalid session data
                  localStorage.removeItem('supabase-session');
                }
              }
            } catch (error) {
              console.error('Error parsing saved session:', error);
              localStorage.removeItem('supabase-session');
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
        
        // Save session state to localStorage for persistence
        if (session) {
          const sessionData = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user_id: session.user.id,
            timestamp: Date.now()
          };
          localStorage.setItem('supabase-session', JSON.stringify(sessionData));
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
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-social-green"></div>
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