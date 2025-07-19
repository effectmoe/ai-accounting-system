import React from 'react';
import { Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SearchFilterProps } from './types';

export function SearchFilter({ filter, value, onChange, className }: SearchFilterProps) {
  switch (filter.type) {
    case 'select':
      return (
        <Select
          value={value || filter.defaultValue || ''}
          onValueChange={onChange}
        >
          <SelectTrigger className={cn('w-[180px]', className)}>
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">すべて</SelectItem>
            {filter.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'text':
      return (
        <Input
          type="text"
          placeholder={filter.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn('w-[180px]', className)}
        />
      );

    case 'date':
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn('w-[180px] justify-start text-left font-normal', className)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {value ? new Date(value).toLocaleDateString('ja-JP') : filter.label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Input
              type="date"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="border-0"
            />
          </PopoverContent>
        </Popover>
      );

    case 'range':
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <Input
            type="number"
            placeholder="最小"
            value={value?.min || ''}
            onChange={(e) => onChange({ ...value, min: e.target.value })}
            className="w-[80px]"
          />
          <span className="text-gray-500">〜</span>
          <Input
            type="number"
            placeholder="最大"
            value={value?.max || ''}
            onChange={(e) => onChange({ ...value, max: e.target.value })}
            className="w-[80px]"
          />
        </div>
      );

    case 'checkbox':
      return (
        <Button
          variant={value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(!value)}
          className={cn('gap-2', className)}
        >
          {value && <Check className="h-4 w-4" />}
          {filter.label}
        </Button>
      );

    default:
      return null;
  }
}