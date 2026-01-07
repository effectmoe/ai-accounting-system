'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthOverlay } from './auth-overlay';
import { Loader2 } from 'lucide-react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  const handleAuthenticated = () => {
    checkAuth();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthOverlay onAuthenticated={handleAuthenticated} />;
  }

  return <>{children}</>;
}