import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, Edit3, Eye, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { VisibilityEditor } from '@/components/cms/editors/VisibilityEditor';

interface VisibilitySettings {
  visible_to_everyone?: boolean;
  visible_to_clients?: boolean;
  visible_to_partners?: boolean;
  visible_to_specjalista?: boolean;
  visible_to_anonymous?: boolean;
}

interface ItemControlsProps {
  onEdit?: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  className?: string;
  visibilityValues?: VisibilitySettings;
  onVisibilityChange?: (values: VisibilitySettings) => void;
}

export const ItemControls: React.FC<ItemControlsProps> = ({
  onEdit,
  onDelete,
  onDuplicate,
  className,
  visibilityValues,
  onVisibilityChange
}) => {
  const isRestricted = visibilityValues && !visibilityValues.visible_to_everyone;

  return (
    <div 
      className={cn(
        "absolute top-2 right-2 z-30 flex gap-1 bg-background/95 backdrop-blur-sm rounded-md shadow-md border border-border p-1 transition-all duration-200",
        "opacity-0 group-hover/item:opacity-100",
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
          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
          title="Edytuj"
        >
          <Edit3 className="w-3 h-3" />
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
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Duplikuj"
        >
          <Copy className="w-3 h-3" />
        </Button>
      )}

      {onVisibilityChange && visibilityValues && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                isRestricted && "text-amber-500 hover:text-amber-600"
              )}
              title="Widoczność"
            >
              {isRestricted ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-56 p-3" 
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <VisibilityEditor
              value={visibilityValues}
              onChange={onVisibilityChange}
              compact
            />
          </PopoverContent>
        </Popover>
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