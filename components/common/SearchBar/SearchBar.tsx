import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchFilter } from './SearchFilters';
import { SearchBarProps } from './types';

const sizeClasses = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
};

export function SearchBar({
  placeholder = '検索...',
  value: externalValue,
  onChange,
  onSearch,
  
  filters = [],
  filterValues = {},
  onFilterChange,
  
  showAdvanced = false,
  onAdvancedToggle,
  
  actions,
  
  className,
  size = 'md',
  variant = 'default',
  debounceMs = 300,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const [isTyping, setIsTyping] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  // Controlled/uncontrolled component handling
  const value = externalValue !== undefined ? externalValue : internalValue;
  
  const handleChange = useCallback((newValue: string) => {
    // Update internal state if uncontrolled
    if (externalValue === undefined) {
      setInternalValue(newValue);
    }
    
    // Call onChange immediately
    onChange?.(newValue);
    
    // Debounce search
    setIsTyping(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setIsTyping(false);
      onSearch?.(newValue);
    }, debounceMs);
  }, [externalValue, onChange, onSearch, debounceMs]);
  
  const handleClear = useCallback(() => {
    handleChange('');
  }, [handleChange]);
  
  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...filterValues };
    
    if (value === '_all' || value === '' || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    onFilterChange?.(newFilters);
  }, [filterValues, onFilterChange]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current);
    };
  }, []);
  
  const hasActiveFilters = Object.keys(filterValues).length > 0;
  
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400',
            size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
          )} />
          
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              'pl-10 pr-10',
              sizeClasses[size],
              variant === 'minimal' && 'border-0 shadow-none bg-gray-100 focus:bg-white'
            )}
          />
          
          {/* Clear button */}
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>
          )}
          
          {/* Loading indicator */}
          {isTyping && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <div className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
            </div>
          )}
        </div>
        
        {/* Filter toggle */}
        {filters.length > 0 && (
          <Button
            variant={hasActiveFilters ? 'default' : 'outline'}
            size={size === 'sm' ? 'sm' : 'default'}
            onClick={onAdvancedToggle}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            フィルター
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {Object.keys(filterValues).length}
              </span>
            )}
          </Button>
        )}
        
        {/* Additional actions */}
        {actions}
      </div>
      
      {/* Filters */}
      {showAdvanced && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {filters.map((filter) => (
            <SearchFilter
              key={filter.key}
              filter={filter}
              value={filterValues[filter.key]}
              onChange={(value) => handleFilterChange(filter.key, value)}
            />
          ))}
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange?.({})}
              className="text-gray-600"
            >
              すべてクリア
            </Button>
          )}
        </div>
      )}
    </div>
  );
}