'use client';

import React from 'react';
import { Autocomplete, TextField, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const StyledAutocomplete = styled(Autocomplete)({
  '& .MuiOutlinedInput-root': {
    height: '40px',
    fontSize: '14px',
    '& fieldset': {
      borderColor: 'hsl(var(--border))',
    },
    '&:hover fieldset': {
      borderColor: 'hsl(var(--border))',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'hsl(var(--ring))',
      borderWidth: '2px',
    },
  },
  '& .MuiAutocomplete-inputRoot': {
    paddingTop: '0',
    paddingBottom: '0',
  },
});

const StyledPaper = styled(Paper)({
  marginTop: '4px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  '& .MuiAutocomplete-listbox': {
    maxHeight: '300px',
    '& .MuiAutocomplete-option': {
      fontSize: '14px',
      padding: '8px 16px',
      '&:hover': {
        backgroundColor: 'hsl(var(--accent))',
      },
      '&[aria-selected="true"]': {
        backgroundColor: 'hsl(var(--accent))',
      },
    },
  },
});

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = '選択してください',
  label,
  required = false,
  disabled = false,
  className = '',
}) => {
  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <StyledAutocomplete
      id={id}
      value={selectedOption}
      onChange={(_, newValue) => {
        onChange(newValue?.value || '');
      }}
      options={options}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) => option.value === value?.value}
      disabled={disabled}
      className={className}
      PaperComponent={StyledPaper}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          label={label}
          required={required}
          variant="outlined"
          size="small"
        />
      )}
      noOptionsText="該当する項目がありません"
      clearText="クリア"
      openText="開く"
      closeText="閉じる"
    />
  );
};