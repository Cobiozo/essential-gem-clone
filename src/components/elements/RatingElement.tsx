import React from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingElementProps {
  value: number;
  max?: number;
  label?: string;
  readonly?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

export const RatingElement: React.FC<RatingElementProps> = ({
  value,
  max = 5,
  label,
  readonly = true,
  onChange,
  className,
}) => {
  const handleClick = (index: number) => {
    if (!readonly && onChange) {
      onChange(index + 1);
    }
  };

  const renderStar = (index: number) => {
    const fillValue = value - index;
    const isFilled = fillValue >= 1;
    const isHalfFilled = fillValue > 0 && fillValue < 1;

    return (
      <button
        key={index}
        type="button"
        onClick={() => handleClick(index)}
        disabled={readonly}
        className={cn(
          'transition-transform',
          !readonly && 'hover:scale-110 cursor-pointer',
          readonly && 'cursor-default'
        )}
      >
        {isFilled ? (
          <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
        ) : isHalfFilled ? (
          <StarHalf className="w-6 h-6 fill-yellow-400 text-yellow-400" />
        ) : (
          <Star className="w-6 h-6 text-muted" />
        )}
      </button>
    );
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => renderStar(i))}
      </div>
    </div>
  );
};
