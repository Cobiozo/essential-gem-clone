import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Copy, Trash2, ClipboardCopy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  id: string;
  label: string;
  isEditing: boolean;
  children: React.ReactNode;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyToClipboard?: () => void;
}

export const SortableSectionWrapper: React.FC<Props> = ({
  id, label, isEditing, children, onEdit, onDuplicate, onDelete, onCopyToClipboard,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className={`group ${isEditing ? 'ring-2 ring-primary ring-inset' : ''}`}>
      {/* Toolbar – visible on hover */}
      <div className="absolute top-2 left-2 right-2 z-[60] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
        <div className="flex items-center gap-1">
          <button
            className="bg-card border border-border rounded p-1.5 shadow cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded shadow font-medium">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" className="h-7 w-7 shadow" onClick={onEdit} title="Edytuj">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {onCopyToClipboard && (
            <Button variant="secondary" size="icon" className="h-7 w-7 shadow" onClick={onCopyToClipboard} title="Kopiuj do schowka">
              <ClipboardCopy className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="secondary" size="icon" className="h-7 w-7 shadow" onClick={onDuplicate} title="Duplikuj">
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="destructive" size="icon" className="h-7 w-7 shadow" onClick={onDelete} title="Usuń">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
};
