import React from 'react';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const IconCard: React.FC<IconCardProps> = ({
  title,
  description,
  icon,
  className,
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center text-center p-6 bg-card rounded-xl border border-border hover:shadow-lg transition-all duration-200",
      className
    )}>
      {/* Icon Circle */}
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        {icon || <Circle className="w-8 h-8 text-primary fill-primary" />}
      </div>
      
      {/* Title */}
      <h4 className="font-bold text-base text-foreground mb-2">
        {title}
      </h4>
      
      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};
