import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface DropZoneProps {
  id: string;
  isEditMode: boolean;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  id,
  isEditMode,
  className,
  children,
  label = "Drop here",
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: !isEditMode,
  });

  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      style={{ touchAction: 'none' }}
      className={cn(
        "relative min-h-[40px] transition-all duration-200",
        isOver && "bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-400 border-dashed",
        !isOver && children && "opacity-100",
        !isOver && !children && "border border-border border-dashed opacity-50 hover:opacity-100",
        className
      )}
    >
      {children}
      
      {/* Drop indicator when no children */}
      {!children && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center text-muted-foreground transition-opacity",
          isOver && "text-blue-600 font-medium"
        )}>
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </div>
        </div>
      )}
      
      {/* Overlay indicator when dragging over */}
      {isOver && children && (
        <div className="absolute inset-0 bg-blue-400/10 border-2 border-blue-400 border-dashed rounded flex items-center justify-center">
          <div className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium shadow-lg">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
};