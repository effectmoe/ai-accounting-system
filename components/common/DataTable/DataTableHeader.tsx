import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableHeaderProps } from './types';

export function DataTableHeader<T>({
  columns,
  sortConfig,
  onSort,
  selection,
  allSelected,
  onSelectAll,
  hasActions,
}: DataTableHeaderProps<T>) {
  const getSortIcon = (column: keyof T | string) => {
    if (!sortConfig || sortConfig.key !== column) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        {selection?.enabled && (
          <th className="px-4 py-3 text-left">
            {selection.multiple !== false && (
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Select all"
              />
            )}
          </th>
        )}
        
        {columns.map((column) => (
          <th
            key={String(column.key)}
            className={cn(
              'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
              column.sortable && 'cursor-pointer hover:bg-gray-100',
              column.align === 'center' && 'text-center',
              column.align === 'right' && 'text-right'
            )}
            style={{ width: column.width }}
            onClick={() => column.sortable && onSort?.(column.key)}
          >
            <div className={cn(
              'flex items-center gap-2',
              column.align === 'center' && 'justify-center',
              column.align === 'right' && 'justify-end'
            )}>
              <span>{column.label}</span>
              {column.sortable && getSortIcon(column.key)}
            </div>
          </th>
        ))}
        
        {hasActions && (
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            アクション
          </th>
        )}
      </tr>
    </thead>
  );
}