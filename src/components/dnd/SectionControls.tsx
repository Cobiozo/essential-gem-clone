import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit3, Copy, EyeOff, Eye, Lock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { VisibilityEditor } from '@/components/cms/editors/VisibilityEditor';
import { useLanguage } from '@/contexts/LanguageContext';

interface VisibilitySettings {
  visible_to_everyone?: boolean;
  visible_to_clients?: boolean;
  visible_to_partners?: boolean;
  visible_to_specjalista?: boolean;
  visible_to_anonymous?: boolean;
}

interface SectionControlsProps {
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDeactivate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
  visibilityValues?: VisibilitySettings;
  onVisibilityChange?: (values: VisibilitySettings) => void;
}

export const SectionControls: React.FC<SectionControlsProps> = ({
  onEdit,
  onDuplicate,
  onDeactivate,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className,
  visibilityValues,
  onVisibilityChange
}) => {
  const { t } = useLanguage();
  const isRestricted = visibilityValues && !visibilityValues.visible_to_everyone;

  return (
    <div 
      className={cn(
        "absolute top-2 right-2 z-40 flex gap-1 bg-background/95 backdrop-blur-sm rounded-md shadow-md border border-border p-1 transition-all duration-200",
        "opacity-0 group-hover/section:opacity-100",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Move Up/Down buttons */}
      {onMoveUp && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={!canMoveUp}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30"
          title={t('controls.moveUp')}
        >
          <ChevronUp className="w-3.5 h-3.5" />
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
          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30"
          title={t('controls.moveDown')}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      )}
      
      {(onMoveUp || onMoveDown) && (onEdit || onDuplicate) && (
        <div className="w-px h-5 bg-border mx-0.5" />
      )}
      
      {onEdit && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-7 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
          title={t('controls.editSection')}
        >
          <Edit3 className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">{t('controls.edit')}</span>
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
          title={t('controls.duplicateSection')}
        >
          <Copy className="w-3.5 h-3.5" />
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
                "h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted",
                isRestricted && "text-amber-500 hover:text-amber-600"
              )}
              title={t('controls.visibility')}
            >
              {isRestricted ? <Lock className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
      
      {onDeactivate && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(t('controls.confirmHide'))) {
              onDeactivate();
            }
          }}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title={t('controls.hideSection')}
        >
          <EyeOff className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};
