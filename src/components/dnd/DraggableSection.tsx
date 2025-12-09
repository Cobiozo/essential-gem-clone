import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DraggableSectionProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
  className?: string;
  isRestricted?: boolean;
  restrictedTooltip?: string;
}

export const DraggableSection: React.FC<DraggableSectionProps> = ({
  id,
  children,
  isEditMode,
  className,
  isRestricted,
  restrictedTooltip,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isEditMode) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={{...style, position: 'relative'}}
      className={cn(
        "group w-full clear-both",
        isOver && "ring-2 ring-primary ring-offset-2",
        isDragging && "opacity-50 scale-105 z-50",
        className
      )}
    >
      {/* Hover overlay with drag handle */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-auto">
          <div className="bg-primary text-primary-foreground p-1 rounded shadow-lg">
            <div
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-primary/90 rounded transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          </div>
          
          {/* Restricted visibility badge */}
          {isRestricted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-amber-500 text-white p-1.5 rounded shadow-lg">
                  <Lock className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {restrictedTooltip || 'Ograniczona widoczność'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="absolute inset-0 border-2 border-primary border-dashed rounded-md pointer-events-none"></div>
      </div>
      
      {/* Content */}
      <div>
        {children}
      </div>
    </div>
  );
};