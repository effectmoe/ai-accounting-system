import React from 'react';
import { LucideIcon, FileX, Database, Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'search' | 'error' | 'no-data';
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantConfig = {
  default: {
    icon: FileX,
    title: 'データがありません',
    message: '表示するデータが見つかりませんでした。',
  },
  search: {
    icon: Search,
    title: '検索結果がありません',
    message: '検索条件を変更してもう一度お試しください。',
  },
  error: {
    icon: FileX,
    title: 'エラーが発生しました',
    message: 'データの読み込み中にエラーが発生しました。',
  },
  'no-data': {
    icon: Database,
    title: 'データが登録されていません',
    message: '新しいデータを追加してください。',
  },
};

export function EmptyState({ 
  title,
  message,
  icon,
  variant = 'default',
  action,
  className 
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {displayTitle}
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        {displayMessage}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}