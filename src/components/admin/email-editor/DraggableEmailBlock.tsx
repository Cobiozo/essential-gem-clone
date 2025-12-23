import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmailBlock } from './types';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BlockPreview } from './BlockPreview';

interface DraggableEmailBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const DraggableEmailBlock: React.FC<DraggableEmailBlockProps> = ({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group bg-card border rounded-md",
        isDragging && "opacity-50 z-50",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      {/* Drag handle & controls - positioned absolutely but with proper z-index */}
      <div className={cn(
        "absolute top-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded",
        "bg-background/90 border shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
      )}>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-accent"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Block content preview - no overlap */}
      <div className="min-h-[40px]">
        <BlockPreview block={block} />
      </div>
    </div>
  );
};
