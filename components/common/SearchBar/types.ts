import { FilterConfig } from '@/types/common';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  
  // Filters
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  
  // Advanced search
  showAdvanced?: boolean;
  onAdvancedToggle?: () => void;
  
  // Actions
  actions?: React.ReactNode;
  
  // Display
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal';
  debounceMs?: number;
}

export interface SearchFilterProps {
  filter: FilterConfig;
  value: any;
  onChange: (value: any) => void;
  className?: string;
}