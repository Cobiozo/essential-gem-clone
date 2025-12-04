import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit3, Copy, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionControlsProps {
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDeactivate?: () => void;
  className?: string;
}

export const SectionControls: React.FC<SectionControlsProps> = ({
  onEdit,
  onDuplicate,
  onDeactivate,
  className
}) => {
  return (
    <div 
      className={cn(
        "absolute top-2 right-2 z-40 flex gap-1 bg-background/95 backdrop-blur-sm rounded-md shadow-md border border-border p-1 transition-all duration-200",
        "opacity-0 group-hover/section:opacity-100",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {onEdit && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
          title="Edytuj sekcję"
        >
          <Edit3 className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">Edytuj</span>
        </Button>
      )}
      
      {onDuplicate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Duplikuj sekcję"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      )}
      
      {onDeactivate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Czy na pewno chcesz ukryć tę sekcję?')) {
              onDeactivate();
            }
          }}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Ukryj sekcję"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};
