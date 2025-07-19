import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactElement;
}

export function FormField({
  label,
  name,
  error,
  required,
  hint,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  // Clone children and add necessary props
  const enhancedChild = React.cloneElement(children, {
    id: name,
    name,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${name}-error` : hint ? `${name}-hint` : undefined,
    className: cn(
      children.props.className,
      error && 'border-red-500 focus:ring-red-500'
    ),
  });

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={name}
        className={cn(
          'text-sm font-medium',
          error && 'text-red-600',
          labelClassName
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {enhancedChild}
      
      {hint && !error && (
        <p id={`${name}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
      
      {error && (
        <div id={`${name}-error`} className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// 便利なラッパーコンポーネント
interface TextFieldProps extends Omit<FormFieldProps, 'children'> {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function TextField({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  ...formFieldProps
}: TextFieldProps) {
  return (
    <FormField {...formFieldProps}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </FormField>
  );
}

interface TextAreaFieldProps extends Omit<FormFieldProps, 'children'> {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  disabled?: boolean;
}

export function TextAreaField({
  placeholder,
  value,
  onChange,
  rows = 4,
  disabled,
  ...formFieldProps
}: TextAreaFieldProps) {
  return (
    <FormField {...formFieldProps}>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
      />
    </FormField>
  );
}

interface SelectFieldProps extends Omit<FormFieldProps, 'children'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  ...formFieldProps
}: SelectFieldProps) {
  return (
    <FormField {...formFieldProps}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}