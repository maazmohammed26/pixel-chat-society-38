
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '@/utils/authUtils';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const authenticated = isAuthenticated();

  useEffect(() => {
    if (!authenticated) {
      console.log('User is not authenticated, redirecting to login');
    }
  }, [authenticated]);

  if (!authenticated) {
    // Redirect to login if not authenticated, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default AuthGuard;
