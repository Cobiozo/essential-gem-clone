import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
  onUpdate?: (elementId: string, updates: Partial<ParsedElement>) => void;
  showOutlines?: boolean;
  depth?: number;
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
  onUpdate,
  showOutlines,
  depth = 0
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
  const hasChildren = element.children.length > 0;
  
  // Container elements that can have nested drag-drop
  const isContainer = ['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'figure'].includes(element.tagName.toLowerCase());

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
            "absolute z-20 cursor-grab active:cursor-grabbing",
            "p-1 bg-muted/80 hover:bg-muted border rounded shadow-sm",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            (isSelected || isHovered) && "opacity-100",
            depth === 0 ? "-left-6 top-1/2 -translate-y-1/2" : "-left-5 top-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      
      {/* Render element with possible nested sortable context for children */}
      {hasChildren && isContainer && isEditMode ? (
        <HtmlElementRenderer
          element={element}
          selectedId={selectedId}
          hoveredId={hoveredId}
          editingId={editingId}
          onSelect={onSelect}
          onHover={onHover}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onUpdate={onUpdate ? (updates) => onUpdate(element.id, updates) : undefined}
          isEditMode={isEditMode}
          showOutlines={showOutlines}
          renderChildren={() => (
            <SortableContext 
              items={element.children.map(c => c.id)} 
              strategy={verticalListSortingStrategy}
            >
              {element.children.map((child) => (
                <DraggableHtmlElement
                  key={child.id}
                  element={child}
                  isEditMode={isEditMode}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  editingId={editingId}
                  onSelect={onSelect}
                  onHover={onHover}
                  onStartEdit={onStartEdit}
                  onEndEdit={onEndEdit}
                  onUpdate={onUpdate}
                  showOutlines={showOutlines}
                  depth={depth + 1}
                />
              ))}
            </SortableContext>
          )}
        />
      ) : (
        <HtmlElementRenderer
          element={element}
          selectedId={selectedId}
          hoveredId={hoveredId}
          editingId={editingId}
          onSelect={onSelect}
          onHover={onHover}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onUpdate={onUpdate ? (updates) => onUpdate(element.id, updates) : undefined}
          isEditMode={isEditMode}
          showOutlines={showOutlines}
        />
      )}
    </div>
  );
};
