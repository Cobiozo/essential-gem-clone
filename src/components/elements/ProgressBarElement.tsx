import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressBarElementProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export const ProgressBarElement: React.FC<ProgressBarElementProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
  className,
}) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="font-medium">{label}</span>}
          {showValue && <span className="text-muted-foreground">{Math.round(percentage)}%</span>}
        </div>
      )}
      <Progress value={percentage} className="h-2" />
    </div>
  );
};
