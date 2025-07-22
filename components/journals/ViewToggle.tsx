'use client';

import React, { useEffect, useState } from 'react';
import { TableIcon, ActivityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewMode } from '@/types/journal';

interface ViewToggleProps {
  defaultView?: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ 
  defaultView = 'timeline', 
  onViewChange,
  className 
}: ViewToggleProps) {
  const [activeView, setActiveView] = useState<ViewMode>(defaultView);

  // Load saved preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('journal-view-mode') as ViewMode;
    if (savedView && (savedView === 'timeline' || savedView === 'table')) {
      setActiveView(savedView);
      onViewChange(savedView);
    }
  }, [onViewChange]);

  const handleViewChange = (view: ViewMode) => {
    setActiveView(view);
    localStorage.setItem('journal-view-mode', view);
    onViewChange(view);
  };

  return (
    <div className={cn('inline-flex rounded-lg bg-gray-100 p-1', className)}>
      <button
        type="button"
        onClick={() => handleViewChange('timeline')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
          activeView === 'timeline'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <ActivityIcon className="h-4 w-4" />
        タイムライン
      </button>
      <button
        type="button"
        onClick={() => handleViewChange('table')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
          activeView === 'table'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        <TableIcon className="h-4 w-4" />
        テーブル
      </button>
    </div>
  );
}