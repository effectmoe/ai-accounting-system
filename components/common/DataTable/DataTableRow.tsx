import React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableRowProps } from './types';

export function DataTableRow<T extends { id: string }>({
  item,
  columns,
  selected,
  onSelect,
  selection,
  actions,
  striped,
  hoverable,
}: DataTableRowProps<T>) {
  const handleRowClick = () => {
    if (selection?.enabled && !selection.showCheckbox) {
      onSelect(item.id);
    }
  };

  return (
    <tr
      className={cn(
        'border-b border-gray-200',
        striped && 'even:bg-gray-50',
        hoverable && 'hover:bg-gray-50 cursor-pointer',
        selected && 'bg-blue-50'
      )}
      onClick={handleRowClick}
    >
      {selection?.enabled && (
        <td className="px-4 py-3">
          {(selection.showCheckbox !== false || selection.multiple !== false) && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect(item.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${item.id}`}
            />
          )}
        </td>
      )}
      
      {columns.map((column) => {
        const value = column.render 
          ? column.render(item)
          : item[column.key as keyof T];
          
        return (
          <td
            key={String(column.key)}
            className={cn(
              'px-4 py-3 text-sm text-gray-900',
              column.align === 'center' && 'text-center',
              column.align === 'right' && 'text-right'
            )}
          >
            {value as React.ReactNode}
          </td>
        );
      })}
      
      {actions && (
        <td className="px-4 py-3 text-right">
          <div onClick={(e) => e.stopPropagation()}>
            {actions(item)}
          </div>
        </td>
      )}
    </tr>
  );
}