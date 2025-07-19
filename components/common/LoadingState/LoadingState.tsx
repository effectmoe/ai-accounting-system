import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullPage?: boolean;
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingState({ 
  size = 'md', 
  fullPage = false, 
  message,
  className 
}: LoadingStateProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size])} />
      {message && (
        <p className="text-sm text-gray-600">{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-screen items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingSpinner({ 
  size = 'md', 
  className 
}: { 
  size?: keyof typeof sizeClasses; 
  className?: string 
}) {
  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
}