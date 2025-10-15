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
        "w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Yellow filled circle icon */}
        <div className="w-8 h-8 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center flex-shrink-0">
          <Circle className="w-4 h-4 text-[hsl(45,100%,51%)] fill-[hsl(45,100%,51%)]" />
        </div>
        
        {/* Title */}
        <span className="font-medium text-sm sm:text-base text-black text-left">
          {title}
        </span>
      </div>
      
      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-black group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
};
