import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex-1">
        {title && (
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        )}
        {description && (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        )}
      </div>
      
      {actions && (
        <div className="mt-4 sm:mt-0 sm:ml-6 flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}