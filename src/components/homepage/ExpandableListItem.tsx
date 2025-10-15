import React from 'react';
import { Circle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableListItemProps {
  title: string;
  onClick?: () => void;
  className?: string;
}

export const ExpandableListItem: React.FC<ExpandableListItemProps> = ({
  title,
  onClick,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 group",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Yellow circle icon */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Circle className="w-4 h-4 text-primary fill-primary" />
        </div>
        
        {/* Title */}
        <span className="font-medium text-sm sm:text-base text-foreground text-left">
          {title}
        </span>
      </div>
      
      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
};
