import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DebouncedStyleInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onFinalChange: (value: string) => void;
  normalizeValue?: (value: string) => string;
  debounceMs?: number;
}

// Helper to normalize CSS values - adds 'px' to numeric dimension values
export const normalizeStyleValue = (key: string, value: string): string => {
  if (!value || value.trim() === '') return value;
  
  const dimensionProps = [
    'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'gap', 'rowGap', 'columnGap',
    'borderRadius', 'borderWidth',
    'top', 'right', 'bottom', 'left',
    'fontSize', 'letterSpacing'
  ];
  
  // If it's a dimension property and value is just a number, add 'px'
  if (dimensionProps.includes(key) && /^\d+(\.\d+)?$/.test(value.trim())) {
    return value.trim() + 'px';
  }
  
  return value;
};

export const DebouncedStyleInput: React.FC<DebouncedStyleInputProps> = ({
  value,
  onFinalChange,
  normalizeValue,
  debounceMs = 500,
  className,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isEditingRef = useRef(false);

  // Sync external value when it changes (but not when we're editing)
  useEffect(() => {
    if (!isEditingRef.current) {
      setLocalValue(value || '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    isEditingRef.current = true;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set debounced save
    timeoutRef.current = setTimeout(() => {
      const finalValue = normalizeValue ? normalizeValue(newValue) : newValue;
      onFinalChange(finalValue);
      isEditingRef.current = false;
    }, debounceMs);
  };

  const handleBlur = () => {
    // Clear pending timeout and save immediately
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const finalValue = normalizeValue ? normalizeValue(localValue) : localValue;
    onFinalChange(finalValue);
    isEditingRef.current = false;
  };

  const handleFocus = () => {
    isEditingRef.current = true;
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Input
      ref={inputRef}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={cn("text-sm", className)}
      {...props}
    />
  );
};
