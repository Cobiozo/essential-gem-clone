import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BLOCK_TYPES, BlockType } from './types';
import { 
  Layout, Type, MousePointer, Image, Square, Minus, MoveVertical, FileText, Plus 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  onAdd?: (blockType: BlockType) => void;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ blockType, onAdd }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${blockType.type}`,
    data: { type: 'palette', blockType },
  });

  const Icon = ICONS[blockType.icon] || Square;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border border-border bg-card",
        "hover:bg-accent hover:border-primary/50 transition-colors group",
        isDragging && "opacity-50"
      )}
    >
      <div 
        {...attributes}
        {...listeners}
        className="flex items-center gap-2 flex-1 cursor-grab"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{blockType.label}</span>
      </div>
      {onAdd && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onAdd(blockType)}
          title="Dodaj blok"
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

interface BlockPaletteProps {
  onAddBlock?: (blockType: BlockType) => void;
}

export const BlockPalette: React.FC<BlockPaletteProps> = ({ onAddBlock }) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Przeciągnij lub kliknij +
      </h3>
      <div className="space-y-1.5">
        {BLOCK_TYPES.map((blockType) => (
          <PaletteItem 
            key={blockType.type} 
            blockType={blockType} 
            onAdd={onAddBlock}
          />
        ))}
      </div>
    </div>
  );
};
