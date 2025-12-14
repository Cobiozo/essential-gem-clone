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

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
  className?: string;
  isRestricted?: boolean;
  restrictedTooltip?: string;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
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
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  if (!isEditMode) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'relative group/item',
        isOver && "ring-2 ring-primary ring-offset-1",
        isDragging && 'opacity-50 scale-105 z-40',
        className
      )}
    >
      {/* Hover overlay with drag handle */}
      <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="absolute inset-0 border border-primary border-dashed rounded pointer-events-none"></div>
      </div>
      
      {/* Drag handle - left side to avoid overlap with ItemControls on right */}
      <div className="absolute top-1 left-1 flex items-center gap-1 z-20">
        <div className="bg-primary text-primary-foreground p-0.5 rounded shadow opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 pointer-events-auto">
          <div
            ref={setActivatorNodeRef}
            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-primary/90 rounded transition-colors touch-none"
            {...listeners}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        </div>
        
        {/* Restricted visibility badge */}
        {isRestricted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-amber-500 text-white p-1 rounded shadow pointer-events-auto">
                <Lock className="w-3 h-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {restrictedTooltip || 'Ograniczona widoczność'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      
      {/* Content */}
      <div
        className={cn(
          'relative',
          isEditMode && 'hover:shadow transition-shadow duration-200'
        )}
      >
        {children}
      </div>
    </div>
  );
};
