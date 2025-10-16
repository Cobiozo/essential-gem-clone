import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, Copy, MoveUp, MoveDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemControlsProps {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export const ItemControls: React.FC<ItemControlsProps> = ({
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className
}) => {
  return (
    <div 
      className={cn(
        "absolute top-2 left-2 z-30 flex gap-1 bg-primary/95 backdrop-blur-sm rounded-lg shadow-lg border-2 border-primary p-1 transition-all duration-200",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary-foreground/20"
        title="Edytuj"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </Button>
      
      {onDuplicate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary-foreground/20"
          title="Duplikuj"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      )}
      
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('Czy na pewno chcesz usunąć ten element?')) {
            onDelete();
          }
        }}
        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/20"
        title="Usuń"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
