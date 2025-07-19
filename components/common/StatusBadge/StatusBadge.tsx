import React from 'react';
import { cn } from '@/lib/utils';
import { statusConfig, StatusType, StatusVariant } from './constants';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const variantClasses = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  destructive: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
};

export function StatusBadge({
  status,
  label,
  variant,
  size = 'md',
  className,
}: StatusBadgeProps) {
  // 既知のステータスの設定を取得
  const config = status in statusConfig ? statusConfig[status as StatusType] : null;
  
  // 表示するラベルを決定
  const displayLabel = label || config?.label || status;
  
  // バリアントを決定
  const displayVariant = variant || config?.variant || 'default';
  
  // クラス名を決定
  const badgeClassName = config?.className || variantClasses[displayVariant];
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        sizeClasses[size],
        badgeClassName,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

// 便利なヘルパーコンポーネント
export function InvoiceStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} size="sm" />;
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} size="sm" />;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const paymentStatusMap: Record<string, StatusType> = {
    'paid': 'paid',
    'pending': 'pending',
    'failed': 'error',
    'refunded': 'cancelled',
  };
  
  return <StatusBadge status={paymentStatusMap[status] || status} size="sm" />;
}