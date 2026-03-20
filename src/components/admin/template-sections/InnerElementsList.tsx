import React, { useState, useCallback } from 'react';
import { InnerElementEditor, type InnerElement } from './InnerElementEditor';
import { DragDropProvider } from '@/components/dnd/DragDropProvider';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, ChevronDown, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  heading: { label: 'Nagłówek', icon: '📝' },
  text: { label: 'Tekst', icon: '📄' },
  image: { label: 'Obraz', icon: '🖼️' },
  button: { label: 'Przycisk', icon: '🔘' },
  badge: { label: 'Badge', icon: '🏷️' },
  divider: { label: 'Rozdzielacz', icon: '➖' },
  spacer: { label: 'Odstęp', icon: '📏' },
  icon_list: { label: 'Lista ikon', icon: '✅' },
  video: { label: 'Wideo', icon: '🎥' },
};

interface SortableItemProps {
  element: InnerElement;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (el: InnerElement) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ element, isExpanded, onToggle, onChange, onDuplicate, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const info = TYPE_LABELS[element.type] || { label: element.type, icon: '📦' };

  return (
    <div ref={setNodeRef} style={style} className="border border-border rounded-lg bg-card">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button className="cursor-grab active:cursor-grabbing p-0.5" {...attributes} {...listeners}>
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button onClick={onToggle} className="flex items-center gap-1.5 flex-1 text-left text-sm">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>{info.icon}</span>
          <span className="font-medium truncate">{info.label}</span>
          {element.type === 'heading' && element.content?.text && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">— {element.content.text}</span>
          )}
        </button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDuplicate}><Copy className="w-3 h-3" /></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}><Trash2 className="w-3 h-3 text-destructive" /></Button>
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <InnerElementEditor element={element} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

interface Props {
  elements: InnerElement[];
  onChange: (elements: InnerElement[]) => void;
}

export const InnerElementsList: React.FC<Props> = ({ elements, onChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = elements.findIndex(e => e.id === active.id);
    const newIdx = elements.findIndex(e => e.id === over.id);
    const reordered = arrayMove(elements, oldIdx, newIdx).map((el, i) => ({ ...el, position: i }));
    onChange(reordered);
  }, [elements, onChange]);

  const addElement = (type: string) => {
    const newEl: InnerElement = {
      id: crypto.randomUUID(),
      type: type as InnerElement['type'],
      content: {},
      style: {},
      position: elements.length,
    };
    onChange([...elements, newEl]);
    setExpandedId(newEl.id);
  };

  const updateElement = (id: string, updated: InnerElement) => {
    onChange(elements.map(el => el.id === id ? updated : el));
  };

  const duplicateElement = (index: number) => {
    const el = elements[index];
    const clone: InnerElement = {
      ...el,
      id: crypto.randomUUID(),
      content: { ...el.content },
      style: { ...el.style },
      position: index + 1,
    };
    const next = [...elements];
    next.splice(index + 1, 0, clone);
    onChange(next.map((e, i) => ({ ...e, position: i })));
  };

  const deleteElement = (index: number) => {
    onChange(elements.filter((_, i) => i !== index).map((e, i) => ({ ...e, position: i })));
  };

  const itemIds = elements.map(e => e.id);

  return (
    <div className="space-y-2">
      {elements.length > 0 && (
        <DragDropProvider items={itemIds} onDragEnd={handleDragEnd}>
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {elements.map((el, i) => (
              <SortableItem
                key={el.id}
                element={el}
                isExpanded={expandedId === el.id}
                onToggle={() => setExpandedId(expandedId === el.id ? null : el.id)}
                onChange={(updated) => updateElement(el.id, updated)}
                onDuplicate={() => duplicateElement(i)}
                onDelete={() => deleteElement(i)}
              />
            ))}
          </SortableContext>
        </DragDropProvider>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            + Dodaj element
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-0.5">
            {Object.entries(TYPE_LABELS).map(([type, { label, icon }]) => (
              <button
                key={type}
                onClick={() => addElement(type)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
