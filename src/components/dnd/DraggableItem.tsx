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
      style={style}
      className={cn(
        "relative group",
        isOver && "ring-2 ring-orange-400 ring-offset-1",
        isDragging && "opacity-50 scale-105 z-40",
        className
      )}
    >
      {/* Hover overlay with drag handle */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="absolute top-1 right-1 bg-orange-500 text-white p-0.5 rounded shadow pointer-events-auto">
          <div
            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-orange-600 rounded transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        </div>
        <div className="absolute inset-0 border border-orange-400 border-dashed rounded"></div>
      </div>
      
      {/* Content */}
      <div className={cn(
        "relative",
        isEditMode && "hover:shadow transition-shadow duration-200"
      )}>
        {children}
      </div>
    </div>
  );
};