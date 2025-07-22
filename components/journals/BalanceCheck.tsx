'use client';

import React, { useMemo } from 'react';
import { AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/journal-utils';

interface BalanceCheckProps {
  debitTotal: number;
  creditTotal: number;
  className?: string;
}

/**
 * 貸借バランスチェックコンポーネント
 * 借方と貸方の合計を表示し、一致しているかどうかを視覚的に示す
 */
export function BalanceCheck({ debitTotal, creditTotal, className }: BalanceCheckProps) {
  const isBalanced = useMemo(() => debitTotal === creditTotal, [debitTotal, creditTotal]);
  const difference = useMemo(() => Math.abs(debitTotal - creditTotal), [debitTotal, creditTotal]);

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isBalanced
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {isBalanced ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangleIcon className="h-5 w-5 text-red-600" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className={cn(
            'text-sm font-medium',
            isBalanced ? 'text-green-800' : 'text-red-800'
          )}>
            {isBalanced ? '貸借一致' : '貸借不一致'}
          </h3>
          
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">借方合計:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(debitTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">貸方合計:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(creditTotal)}
              </span>
            </div>
            
            {!isBalanced && (
              <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                <span className="text-gray-600">差額:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(difference)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}