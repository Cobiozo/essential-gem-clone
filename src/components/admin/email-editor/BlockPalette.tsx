import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BLOCK_TYPES, BlockType } from './types';
import { 
  Layout, Type, MousePointer, Image, Square, Minus, MoveVertical, FileText 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Layout,
  Type,
  MousePointer,
  Image,
  Square,
  Minus,
  MoveVertical,
  FileText,
};

interface PaletteItemProps {
  blockType: BlockType;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ blockType }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${blockType.type}`,
    data: { type: 'palette', blockType },
  });

  const Icon = ICONS[blockType.icon] || Square;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border border-border bg-card",
        "cursor-grab hover:bg-accent hover:border-primary/50 transition-colors",
        isDragging && "opacity-50 cursor-grabbing"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{blockType.label}</span>
    </div>
  );
};

export const BlockPalette: React.FC = () => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Przeciągnij blok na kanwę
      </h3>
      <div className="space-y-1.5">
        {BLOCK_TYPES.map((blockType) => (
          <PaletteItem key={blockType.type} blockType={blockType} />
        ))}
      </div>
    </div>
  );
};
