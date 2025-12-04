import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemControlsProps {
  onDelete: () => void;
  onDuplicate?: () => void;
  className?: string;
}

export const ItemControls: React.FC<ItemControlsProps> = ({
  onDelete,
  onDuplicate,
  className
}) => {
  return (
    <div 
      className={cn(
        "absolute top-2 right-2 z-30 flex gap-1 bg-background/95 backdrop-blur-sm rounded-md shadow-md border border-border p-1 transition-all duration-200",
        "opacity-0 group-hover:opacity-100",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {onDuplicate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Duplikuj"
        >
          <Copy className="w-3 h-3" />
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
        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Usuń"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};
