import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { LoadingState } from '../LoadingState';
import { EmptyState } from '../EmptyState';
import { DataTableHeader } from './DataTableHeader';
import { DataTableRow } from './DataTableRow';
import { DataTablePagination } from './DataTablePagination';
import { Button } from '@/components/ui/button';
import { DataTableProps } from './types';

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  error = null,
  
  sortable = true,
  sortConfig,
  onSort,
  
  selection,
  selectedItems = new Set<string>(),
  onSelectionChange,
  
  pagination,
  onPageChange,
  onPageSizeChange,
  
  actions,
  bulkActions,
  
  emptyMessage,
  className,
  striped = false,
  hoverable = true,
  compact = false,
}: DataTableProps<T>) {
  const [localSelectedItems, setLocalSelectedItems] = useState<Set<string>>(selectedItems);
  
  // Use local state if no external control
  const effectiveSelectedItems = onSelectionChange ? selectedItems : localSelectedItems;
  
  const handleSelectionChange = useCallback((id: string) => {
    const newSelection = new Set(effectiveSelectedItems);
    
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      if (selection?.multiple === false) {
        newSelection.clear();
      }
      newSelection.add(id);
    }
    
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    } else {
      setLocalSelectedItems(newSelection);
    }
  }, [effectiveSelectedItems, onSelectionChange, selection?.multiple]);
  
  const handleSelectAll = useCallback(() => {
    const newSelection = new Set<string>();
    
    if (effectiveSelectedItems.size !== data.length) {
      data.forEach(item => newSelection.add(item.id));
    }
    
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    } else {
      setLocalSelectedItems(newSelection);
    }
  }, [data, effectiveSelectedItems.size, onSelectionChange]);
  
  const allSelected = useMemo(() => {
    return data.length > 0 && effectiveSelectedItems.size === data.length;
  }, [data.length, effectiveSelectedItems.size]);
  
  // Loading state
  if (loading) {
    return (
      <div className={cn('bg-white rounded-lg shadow', className)}>
        <div className="p-8">
          <LoadingState message="データを読み込んでいます..." />
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={cn('bg-white rounded-lg shadow', className)}>
        <EmptyState
          variant="error"
          title="エラーが発生しました"
          message={error.message || 'データの読み込み中にエラーが発生しました。'}
          action={{
            label: '再試行',
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }
  
  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg shadow', className)}>
        <EmptyState
          variant="no-data"
          message={emptyMessage}
        />
      </div>
    );
  }
  
  return (
    <div className={cn('bg-white rounded-lg shadow', className)}>
      {/* Bulk actions */}
      {bulkActions && effectiveSelectedItems.size > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              {effectiveSelectedItems.size}件選択中
            </span>
            {bulkActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={() => action.onClick(Array.from(effectiveSelectedItems))}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className={cn(
          'min-w-full divide-y divide-gray-200',
          compact && 'table-compact'
        )}>
          <DataTableHeader
            columns={columns}
            sortConfig={sortConfig}
            onSort={sortable ? onSort : undefined}
            selection={selection}
            allSelected={allSelected}
            onSelectAll={handleSelectAll}
            hasActions={!!actions}
          />
          
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <DataTableRow
                key={item.id}
                item={item}
                columns={columns}
                selected={effectiveSelectedItems.has(item.id)}
                onSelect={handleSelectionChange}
                selection={selection}
                actions={actions}
                striped={striped}
                hoverable={hoverable}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {pagination && onPageChange && onPageSizeChange && (
        <DataTablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}