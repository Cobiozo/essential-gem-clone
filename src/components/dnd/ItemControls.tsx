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
        "absolute top-2 right-2 z-10 flex gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-1",
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
        className="h-7 w-7 p-0"
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
          className="h-7 w-7 p-0"
          title="Duplikuj"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      )}
      
      {onMoveUp && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={!canMoveUp}
          className="h-7 w-7 p-0"
          title="Przesuń w górę"
        >
          <MoveUp className="w-3.5 h-3.5" />
        </Button>
      )}
      
      {onMoveDown && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={!canMoveDown}
          className="h-7 w-7 p-0"
          title="Przesuń w dół"
        >
          <MoveDown className="w-3.5 h-3.5" />
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
        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        title="Usuń"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
