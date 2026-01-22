import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ParsedElement } from './types';
import { HtmlElementRenderer } from './HtmlElementRenderer';
import { cn } from '@/lib/utils';

interface DraggableHtmlElementProps {
  element: ParsedElement;
  isEditMode: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  editingId?: string | null;
  onSelect: (element: ParsedElement) => void;
  onHover: (id: string | null) => void;
  onStartEdit?: (id: string) => void;
  onEndEdit?: (id: string, newContent: string) => void;
  showOutlines?: boolean;
}

export const DraggableHtmlElement: React.FC<DraggableHtmlElementProps> = ({
  element,
  isEditMode,
  selectedId,
  hoveredId,
  editingId,
  onSelect,
  onHover,
  onStartEdit,
  onEndEdit,
  showOutlines
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
    id: element.id, 
    disabled: !isEditMode || editingId === element.id 
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const isSelected = selectedId === element.id;
  const isHovered = hoveredId === element.id;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        'relative group',
        isDragging && 'opacity-50 shadow-lg',
        isOver && !isDragging && 'ring-2 ring-primary/50 ring-dashed'
      )}
    >
      {/* Drag handle - only visible in edit mode */}
      {isEditMode && !editingId && (
        <div 
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className={cn(
            "absolute -left-6 top-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing",
            "p-1 bg-muted/80 hover:bg-muted border rounded shadow-sm",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            (isSelected || isHovered) && "opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      
      <HtmlElementRenderer
        element={element}
        selectedId={selectedId}
        hoveredId={hoveredId}
        editingId={editingId}
        onSelect={onSelect}
        onHover={onHover}
        onStartEdit={onStartEdit}
        onEndEdit={onEndEdit}
        showOutlines={showOutlines}
      />
    </div>
  );
};
