'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, SkipForward, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmationStatus } from '@/lib/confirmation-config';

interface PendingConfirmationBadgeProps {
  needsConfirmation: boolean;
  confirmationStatus?: ConfirmationStatus;
  pendingCategory?: string;
  className?: string;
  showCategory?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

/**
 * 確認待ち状態を表示するバッジコンポーネント
 *
 * 表示パターン:
 * - needsConfirmation=false: 表示なし（確認不要）
 * - confirmationStatus='pending': 黄色の確認待ちバッジ
 * - confirmationStatus='confirmed': 緑色の確認済みバッジ
 * - confirmationStatus='skipped': グレーのスキップ済みバッジ
 */
export function PendingConfirmationBadge({
  needsConfirmation,
  confirmationStatus = 'pending',
  pendingCategory,
  className,
  showCategory = false,
  size = 'md',
  onClick,
}: PendingConfirmationBadgeProps) {
  // 確認が不要な場合は何も表示しない
  if (!needsConfirmation && confirmationStatus !== 'confirmed' && confirmationStatus !== 'skipped') {
    return null;
  }

  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // ステータスに応じたスタイルとコンテンツ
  const statusConfig = {
    pending: {
      variant: 'outline' as const,
      className: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50',
      icon: <AlertCircle className={cn(iconSizes[size], 'mr-1')} />,
      label: '確認待ち',
      clickable: true,
    },
    confirmed: {
      variant: 'outline' as const,
      className: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
      icon: <CheckCircle className={cn(iconSizes[size], 'mr-1')} />,
      label: '確認済み',
      clickable: false,
    },
    skipped: {
      variant: 'outline' as const,
      className: 'border-gray-400 bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
      icon: <SkipForward className={cn(iconSizes[size], 'mr-1')} />,
      label: 'スキップ',
      clickable: false,
    },
  };

  const config = statusConfig[confirmationStatus] || statusConfig.pending;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        sizeClasses[size],
        config.className,
        config.clickable && onClick && 'cursor-pointer',
        className
      )}
      onClick={config.clickable && onClick ? onClick : undefined}
    >
      {config.icon}
      <span>{config.label}</span>
      {showCategory && pendingCategory && confirmationStatus === 'pending' && (
        <span className="ml-1 opacity-75">({pendingCategory})</span>
      )}
    </Badge>
  );
}

/**
 * 確認待ち件数を表示するカウンターバッジ
 */
interface ConfirmationCountBadgeProps {
  count: number;
  className?: string;
  onClick?: () => void;
}

export function ConfirmationCountBadge({
  count,
  className,
  onClick,
}: ConfirmationCountBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge
      variant="destructive"
      className={cn(
        'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <HelpCircle className="h-3 w-3 mr-1" />
      {count}件の確認待ち
    </Badge>
  );
}

/**
 * 確認フロー用のステータスインジケーター
 * ドキュメント一覧などで使用
 */
interface ConfirmationStatusIndicatorProps {
  needsConfirmation: boolean;
  confirmationStatus?: ConfirmationStatus;
  className?: string;
}

export function ConfirmationStatusIndicator({
  needsConfirmation,
  confirmationStatus = 'pending',
  className,
}: ConfirmationStatusIndicatorProps) {
  if (!needsConfirmation) {
    return (
      <span className={cn('inline-flex items-center text-green-600 dark:text-green-400', className)}>
        <CheckCircle className="h-4 w-4" />
      </span>
    );
  }

  if (confirmationStatus === 'confirmed') {
    return (
      <span className={cn('inline-flex items-center text-green-600 dark:text-green-400', className)}>
        <CheckCircle className="h-4 w-4" />
      </span>
    );
  }

  if (confirmationStatus === 'skipped') {
    return (
      <span className={cn('inline-flex items-center text-gray-500 dark:text-gray-400', className)}>
        <SkipForward className="h-4 w-4" />
      </span>
    );
  }

  // pending
  return (
    <span className={cn('inline-flex items-center text-amber-500 dark:text-amber-400 animate-pulse', className)}>
      <AlertCircle className="h-4 w-4" />
    </span>
  );
}
