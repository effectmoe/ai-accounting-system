'use client';

import React, { useMemo, useCallback } from 'react';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { ColumnDef } from '@/components/common/DataTable/types';
import { JournalEntry } from '@/types/collections';
import { JournalTableItem } from '@/types/journal';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { EditIcon, TrashIcon, FileTextIcon } from 'lucide-react';
import {
  calculateDebitTotal,
  calculateCreditTotal,
  formatCurrency,
  getSourceTypeLabel,
  getStatusLabel,
  getStatusClassName,
} from '@/lib/journal-utils';

interface JournalTableProps {
  journals: JournalEntry[];
  loading?: boolean;
  error?: Error | null;
  onEdit?: (journal: JournalEntry) => void;
  onDelete?: (journal: JournalEntry) => void;
  onView?: (journal: JournalEntry) => void;
  className?: string;
}

/**
 * 仕訳テーブルコンポーネント
 * DataTableを使用して仕訳の一覧を表示する
 */
export function JournalTable({
  journals,
  loading = false,
  error = null,
  onEdit,
  onDelete,
  onView,
  className
}: JournalTableProps) {
  /**
   * DataTable用にID付きのデータに変換
   */
  const tableData: JournalTableItem[] = useMemo(() => {
    return journals.map(journal => ({
      ...journal,
      id: journal._id?.toString() || journal.journalNumber
    }));
  }, [journals]);

  const columns: ColumnDef<JournalTableItem>[] = useMemo(() => [
    {
      id: 'journalNumber',
      header: '仕訳番号',
      cell: (item) => (
        <span className="font-medium text-gray-900">{item.journalNumber}</span>
      ),
      sortable: true,
    },
    {
      id: 'entryDate',
      header: '日付',
      cell: (item) => (
        <span className="text-sm text-gray-600">
          {format(new Date(item.entryDate), 'yyyy/MM/dd', { locale: ja })}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'description',
      header: '摘要',
      cell: (item) => (
        <div>
          <p className="text-sm text-gray-900 line-clamp-2">{item.description}</p>
          {item.notes && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">備考: {item.notes}</p>
          )}
        </div>
      ),
    },
    {
      id: 'debitTotal',
      header: '借方合計',
      cell: (item) => {
        const total = calculateDebitTotal(item.lines);
        return (
          <span className="text-sm font-medium text-blue-600">
            {formatCurrency(total)}
          </span>
        );
      },
      align: 'right',
      sortable: true,
    },
    {
      id: 'creditTotal',
      header: '貸方合計',
      cell: (item) => {
        const total = calculateCreditTotal(item.lines);
        return (
          <span className="text-sm font-medium text-red-600">
            {formatCurrency(total)}
          </span>
        );
      },
      align: 'right',
      sortable: true,
    },
    {
      id: 'balance',
      header: '貸借差額',
      cell: (item) => {
        const debitTotal = calculateDebitTotal(item.lines);
        const creditTotal = calculateCreditTotal(item.lines);
        const difference = debitTotal - creditTotal;
        const isBalanced = difference === 0;

        return (
          <div className="text-sm text-right">
            <span className={`font-medium ${
              isBalanced ? 'text-green-600' : 'text-red-600'
            }`}>
              {isBalanced ? '一致' : formatCurrency(Math.abs(difference))}
            </span>
          </div>
        );
      },
      align: 'right',
    },
    {
      id: 'status',
      header: 'ステータス',
      cell: (item) => (
        <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${
          getStatusClassName(item.status)
        }`}>
          {getStatusLabel(item.status)}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'sourceType',
      header: '入力方法',
      cell: (item) => {
        if (!item.sourceType) return <span className="text-gray-400">-</span>;
        
        return (
          <span className="text-xs text-gray-500">
            {getSourceTypeLabel(item.sourceType)}
          </span>
        );
      },
    },
  ], []);

  /**
   * アクションボタンの設定
   * onView, onEdit, onDelete が渡されている場合のみ表示
   */
  const actions = useMemo(() => {
    const actionItems = [];

    if (onView) {
      actionItems.push({
        label: '詳細',
        icon: <FileTextIcon className="h-4 w-4" />,
        onClick: (item: JournalTableItem) => onView(item),
      });
    }

    if (onEdit) {
      actionItems.push({
        label: '編集',
        icon: <EditIcon className="h-4 w-4" />,
        onClick: (item: JournalTableItem) => onEdit(item),
      });
    }

    if (onDelete) {
      actionItems.push({
        label: '削除',
        icon: <TrashIcon className="h-4 w-4" />,
        onClick: (item: JournalTableItem) => onDelete(item),
        variant: 'destructive' as const,
      });
    }

    return actionItems.length > 0 ? actionItems : undefined;
  }, [onView, onEdit, onDelete]);

  return (
    <DataTable
      data={tableData}
      columns={columns}
      loading={loading}
      error={error}
      actions={actions}
      className={className}
      striped
      hoverable
      emptyMessage="仕訳データがありません"
    />
  );
}