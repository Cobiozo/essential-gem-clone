import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinKeypadProps {
  onComplete: (code: string) => void;
  loading?: boolean;
  disabled?: boolean;
  submitLabel?: string;
  maxDigits?: number;
  resetKey?: number;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onComplete,
  loading = false,
  disabled = false,
  submitLabel = 'Weryfikuj',
  maxDigits = 6,
  resetKey = 0,
}) => {
  const [digits, setDigits] = useState<string[]>([]);

  // Reset digits when resetKey changes (e.g. after failed attempt)
  useEffect(() => {
    setDigits([]);
  }, [resetKey]);

  const addDigit = useCallback((d: string) => {
    if (disabled || loading) return;
    setDigits(prev => {
      if (prev.length >= maxDigits) return prev;
      return [...prev, d];
    });
  }, [disabled, loading, maxDigits]);

  const removeDigit = useCallback(() => {
    if (disabled || loading) return;
    setDigits(prev => prev.slice(0, -1));
  }, [disabled, loading]);

  const resetDigits = useCallback(() => {
    if (disabled || loading) return;
    setDigits([]);
  }, [disabled, loading]);

  // Physical keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled || loading) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        removeDigit();
      } else if (e.key === 'Enter' && digits.length === maxDigits) {
        e.preventDefault();
        onComplete(digits.join(''));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addDigit, removeDigit, digits, maxDigits, onComplete, disabled, loading]);

  const code = digits.join('');
  const isFull = digits.length === maxDigits;

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['reset', '0', 'delete'],
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Dot indicators */}
      <div className="flex gap-3 py-2">
        {Array.from({ length: maxDigits }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-all duration-200',
              i < digits.length
                ? 'bg-primary border-primary scale-110'
                : 'bg-transparent border-muted-foreground/40'
            )}
          />
        ))}
      </div>

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
        {keys.flat().map((key) => {
          if (key === 'reset') {
            return (
              <button
                key={key}
                onClick={resetDigits}
                disabled={disabled || loading || digits.length === 0}
                className="h-14 rounded-lg text-sm font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Reset
              </button>
            );
          }
          if (key === 'delete') {
            return (
              <button
                key={key}
                onClick={removeDigit}
                disabled={disabled || loading || digits.length === 0}
                className="h-14 rounded-lg flex items-center justify-center bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Delete className="w-5 h-5 text-foreground" />
              </button>
            );
          }
          return (
            <button
              key={key}
              onClick={() => addDigit(key)}
              disabled={disabled || loading || isFull}
              className="h-14 rounded-lg text-xl font-semibold bg-muted hover:bg-muted/80 text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Submit button */}
      <Button
        onClick={() => onComplete(code)}
        disabled={!isFull || loading || disabled}
        className="w-full max-w-[280px]"
        size="lg"
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
};
