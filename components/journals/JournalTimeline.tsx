'use client';

import React, { useMemo, useCallback } from 'react';
import { CalendarIcon, FileTextIcon } from 'lucide-react';
import { BalanceCheck } from './BalanceCheck';
import { cn } from '@/lib/utils';
import { JournalEntry } from '@/types/collections';
import { GroupedJournals } from '@/types/journal';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  calculateDebitTotal,
  calculateCreditTotal,
  formatCurrency,
  getSourceTypeLabel,
  getStatusLabel,
  getStatusClassName,
} from '@/lib/journal-utils';

interface JournalTimelineProps {
  journals: JournalEntry[];
  className?: string;
}

export function JournalTimeline({ journals, className }: JournalTimelineProps) {
  /**
   * 仕訳を日付でグループ化する
   * 最新の日付が上に来るようにソート
   */
  const groupedJournals = useMemo(() => {
    const groups: GroupedJournals = {};
    
    journals.forEach((journal) => {
      const dateKey = format(new Date(journal.entryDate), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(journal);
    });
    
    // 日付を降順でソート（最新日付が最初）
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [journals]);

  /**
   * 日付を日本語形式でフォーマット
   */
  const formatDateWithDay = useCallback((date: string) => {
    return format(new Date(date), 'yyyy年MM月dd日(E)', { locale: ja });
  }, []);

  return (
    <div className={cn('space-y-8', className)}>
      {groupedJournals.map(([date, dayJournals]) => {
        const formattedDate = formatDateWithDay(date);
        
        return (
          <div key={date} className="relative">
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">{formattedDate}</h3>
                <span className="text-sm text-gray-500">({dayJournals.length}件)</span>
              </div>
            </div>

            {/* Timeline for the day */}
            <div className="mt-4 space-y-4 pl-8 relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />

              {dayJournals.map((journal, index) => {
                // 貸借合計を計算
                const debitTotal = calculateDebitTotal(journal.lines);
                const creditTotal = calculateCreditTotal(journal.lines);
                const isBalanced = debitTotal === creditTotal;

                return (
                  <div key={journal._id?.toString() || index} className="relative">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute -left-6 top-0 w-4 h-4 rounded-full border-2 bg-white',
                        isBalanced
                          ? 'border-green-500'
                          : 'border-red-500'
                      )}
                    />

                    {/* Journal card */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {journal.journalNumber}
                            </span>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              getStatusClassName(journal.status)
                            )}>
                              {getStatusLabel(journal.status)}
                            </span>
                          </div>
                          <BalanceCheck
                            debitTotal={debitTotal}
                            creditTotal={creditTotal}
                            className="ml-4"
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{journal.description}</p>
                      </div>

                      {/* Journal lines */}
                      <div className="divide-y divide-gray-200">
                        {journal.lines.map((line, lineIndex) => (
                          <div key={lineIndex} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {line.accountName}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({line.accountCode})
                                </span>
                              </div>
                              {line.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{line.description}</p>
                              )}
                            </div>
                            
                            <div className="flex gap-8 text-sm">
                              {/* Debit */}
                              <div className="text-right">
                                <div className="text-xs text-gray-500 mb-0.5">借方</div>
                                <div className={cn(
                                  'font-medium',
                                  line.debitAmount > 0 ? 'text-blue-600' : 'text-gray-400'
                                )}>
                                  {line.debitAmount > 0 
                                    ? formatCurrency(line.debitAmount)
                                    : '-'
                                  }
                                </div>
                              </div>
                              
                              {/* Credit */}
                              <div className="text-right">
                                <div className="text-xs text-gray-500 mb-0.5">貸方</div>
                                <div className={cn(
                                  'font-medium',
                                  line.creditAmount > 0 ? 'text-red-600' : 'text-gray-400'
                                )}>
                                  {line.creditAmount > 0 
                                    ? formatCurrency(line.creditAmount)
                                    : '-'
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer with metadata */}
                      {(journal.notes || journal.sourceType) && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {journal.sourceType && (
                              <span>
                                入力方法: {getSourceTypeLabel(journal.sourceType)}
                              </span>
                            )}
                            {journal.notes && (
                              <span className="truncate">備考: {journal.notes}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}