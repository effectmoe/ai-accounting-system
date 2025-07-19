import { TableColumn, SortConfig, SelectionConfig, PaginationConfig } from '@/types/common';

export interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: Error | null;
  
  // Sorting
  sortable?: boolean;
  sortConfig?: SortConfig<T>;
  onSort?: (column: keyof T) => void;
  
  // Selection
  selection?: SelectionConfig;
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  
  // Pagination
  pagination?: PaginationConfig;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  
  // Actions
  actions?: (item: T) => React.ReactNode;
  bulkActions?: Array<{
    label: string;
    onClick: (selectedIds: string[]) => void;
    variant?: 'default' | 'destructive';
  }>;
  
  // Display
  emptyMessage?: string;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

export interface DataTableHeaderProps<T> {
  columns: TableColumn<T>[];
  sortConfig?: SortConfig<T>;
  onSort?: (column: keyof T) => void;
  selection?: SelectionConfig;
  allSelected: boolean;
  onSelectAll: () => void;
  hasActions?: boolean;
}

export interface DataTableRowProps<T extends { id: string }> {
  item: T;
  columns: TableColumn<T>[];
  selected: boolean;
  onSelect: (id: string) => void;
  selection?: SelectionConfig;
  actions?: (item: T) => React.ReactNode;
  striped?: boolean;
  hoverable?: boolean;
}