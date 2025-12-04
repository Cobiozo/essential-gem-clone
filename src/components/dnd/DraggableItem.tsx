import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
  className?: string;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  children,
  isEditMode,
  className,
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
        'relative group',
        isOver && "ring-2 ring-primary ring-offset-1",
        isDragging && 'opacity-50 scale-105 z-40',
        className
      )}
    >
      {/* Hover overlay with drag handle */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="absolute inset-0 border border-primary border-dashed rounded"></div>
      </div>
      
      {/* Drag handle - left side to avoid overlap with ItemControls on right */}
      <div className="absolute top-1 left-1 bg-primary text-primary-foreground p-0.5 rounded shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
        <div
          ref={setActivatorNodeRef}
          className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-primary/90 rounded transition-colors touch-none"
          {...listeners}
        >
          <GripVertical className="w-3 h-3" />
        </div>
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
