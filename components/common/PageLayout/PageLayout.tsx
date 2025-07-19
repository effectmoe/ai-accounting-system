import React from 'react';
import { cn } from '@/lib/utils';
import { PageHeader } from './PageHeader';
import { Breadcrumb } from './Breadcrumb';

interface PageLayoutProps {
  children: React.ReactNode;
  
  // Header
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  
  // Breadcrumb
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  
  // Layout
  variant?: 'default' | 'full' | 'narrow';
  className?: string;
  contentClassName?: string;
}

const variantClasses = {
  default: 'max-w-7xl mx-auto',
  full: 'w-full',
  narrow: 'max-w-4xl mx-auto',
};

export function PageLayout({
  children,
  title,
  description,
  actions,
  breadcrumbs,
  variant = 'default',
  className,
  contentClassName,
}: PageLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      <div className={cn('px-4 sm:px-6 lg:px-8 py-8', variantClasses[variant])}>
        {/* Breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-4">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}
        
        {/* Header */}
        {(title || actions) && (
          <PageHeader
            title={title}
            description={description}
            actions={actions}
            className="mb-6"
          />
        )}
        
        {/* Content */}
        <div className={cn('space-y-6', contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Section component for consistent spacing
interface PageSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageSection({
  children,
  title,
  description,
  actions,
  className,
}: PageSectionProps) {
  return (
    <section className={cn('bg-white rounded-lg shadow', className)}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-medium text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}