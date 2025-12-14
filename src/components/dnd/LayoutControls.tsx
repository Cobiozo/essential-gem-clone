import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  RotateCcw,
  Copy,
  Trash2,
  Settings,
  Columns,
  Columns2,
  Columns3,
  Grid3X3,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

interface LayoutControlsProps {
  isVisible: boolean;
  selectedElement?: string;
  layoutMode: 'single' | 'columns' | 'grid';
  columnCount: number;
  onLayoutModeChange: (mode: 'single' | 'columns' | 'grid') => void;
  onColumnCountChange: (count: number) => void;
  onDuplicateElement?: () => void;
  onDeleteElement?: () => void;
  onResetElement?: () => void;
  onElementSettings?: () => void;
  onAlignElement?: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  onSizeElement?: (sizeType: 'fit' | 'full') => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onTogglePreview?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasUnsavedChanges?: boolean;
  isPreviewMode?: boolean;
  autoSaveStatus?: 'saved' | 'saving' | 'error';
  className?: string;
  sections?: any[];
  items?: any[];
}

export const LayoutControls: React.FC<LayoutControlsProps> = ({
  isVisible,
  selectedElement,
  layoutMode,
  columnCount,
  onLayoutModeChange,
  onColumnCountChange,
  onDuplicateElement,
  onDeleteElement,
  onResetElement,
  onElementSettings,
  onAlignElement,
  onSizeElement,
  onUndo,
  onRedo,
  onSave,
  onTogglePreview,
  canUndo = false,
  canRedo = false,
  hasUnsavedChanges = false,
  isPreviewMode = false,
  autoSaveStatus = 'saved',
  className,
  sections = [],
  items = [],
}) => {
  if (!isVisible) return null;

  // Get selected element title
  const getSelectedElementDisplay = () => {
    if (!selectedElement) return null;
    
    const section = sections.find(s => s.id === selectedElement);
    const item = items.find(i => i.id === selectedElement);
    
    if (section) {
      return section.title || 'Sekcja';
    }
    
    if (item) {
      return item.title || item.type || 'Element';
    }
    
    return 'Element';
  };

  const TooltipButton = ({ 
    children, 
    tooltip, 
    shortcut,
    ...props 
  }: { 
    children: React.ReactNode; 
    tooltip: string;
    shortcut?: string;
  } & React.ComponentProps<typeof Button>) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...props}>{children}</Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="flex items-center gap-2">
          <span>{tooltip}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">{shortcut}</kbd>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className={cn(
      "fixed bottom-20 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-50",
      "bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-2xl",
      "flex items-center gap-1 px-2 py-1.5",
      "animate-fade-in",
      "max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide",
      "pb-safe",
      className
    )}>
      {/* Undo/Redo Controls */}
      <div className="flex items-center gap-0.5">
        <TooltipButton
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="px-2 h-8"
          tooltip="Cofnij"
          shortcut="Ctrl+Z"
        >
          <Undo2 className="w-4 h-4" />
        </TooltipButton>
        <TooltipButton
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="px-2 h-8"
          tooltip="Ponów"
          shortcut="Ctrl+Y"
        >
          <Redo2 className="w-4 h-4" />
        </TooltipButton>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Layout Mode Controls */}
      <div className="flex items-center gap-0.5">
        <TooltipButton
          variant={layoutMode === 'single' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutModeChange('single')}
          className="px-2 h-8"
          tooltip="Pojedyncza kolumna"
        >
          <AlignLeft className="w-4 h-4" />
        </TooltipButton>
        <TooltipButton
          variant={layoutMode === 'columns' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutModeChange('columns')}
          className="px-2 h-8"
          tooltip="Wiele kolumn"
        >
          <Columns className="w-4 h-4" />
        </TooltipButton>
        <TooltipButton
          variant={layoutMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutModeChange('grid')}
          className="px-2 h-8"
          tooltip="Układ siatki"
        >
          <Grid3X3 className="w-4 h-4" />
        </TooltipButton>
      </div>

      {/* Column Count Controls (when in columns mode) */}
      {layoutMode === 'columns' && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4].map((count) => (
              <TooltipButton
                key={count}
                variant={columnCount === count ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onColumnCountChange(count)}
                className="px-2 h-8"
                tooltip={`${count} ${count === 1 ? 'kolumna' : count < 5 ? 'kolumny' : 'kolumn'}`}
              >
                {count === 1 && <Columns className="w-4 h-4" />}
                {count === 2 && <Columns2 className="w-4 h-4" />}
                {count === 3 && <Columns3 className="w-4 h-4" />}
                {count === 4 && <Grid3X3 className="w-4 h-4" />}
              </TooltipButton>
            ))}
          </div>
        </>
      )}

      {/* Element Controls (when element is selected) */}
      {selectedElement && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <div className="flex items-center gap-0.5">
            <Badge variant="secondary" className="text-xs px-2 py-0.5 max-w-[100px] truncate">
              {getSelectedElementDisplay()}
            </Badge>
            
            <TooltipButton
              variant="ghost"
              size="sm"
              onClick={onDuplicateElement}
              className="px-2 h-8"
              tooltip="Duplikuj"
              shortcut="Ctrl+D"
            >
              <Copy className="w-4 h-4" />
            </TooltipButton>
            
            <TooltipButton
              variant="ghost"
              size="sm"
              onClick={onResetElement}
              className="px-2 h-8"
              tooltip="Resetuj rozmiar"
            >
              <RotateCcw className="w-4 h-4" />
            </TooltipButton>
            
            <TooltipButton
              variant="ghost"
              size="sm"
              onClick={onElementSettings}
              className="px-2 h-8"
              tooltip="Ustawienia"
            >
              <Settings className="w-4 h-4" />
            </TooltipButton>
            
            <TooltipButton
              variant="ghost"
              size="sm"
              onClick={onDeleteElement}
              className="px-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              tooltip="Usuń"
              shortcut="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </TooltipButton>
          </div>
        </>
      )}

      {/* Alignment Controls */}
      {selectedElement && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <div className="flex items-center gap-0.5">
            <TooltipButton
              variant="ghost"
              size="sm"
              className="px-2 h-8"
              tooltip="Wyrównaj do lewej"
              onClick={() => onAlignElement?.('left')}
            >
              <AlignLeft className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="sm"
              className="px-2 h-8"
              tooltip="Wyśrodkuj"
              onClick={() => onAlignElement?.('center')}
            >
              <AlignCenter className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="sm"
              className="px-2 h-8"
              tooltip="Wyrównaj do prawej"
              onClick={() => onAlignElement?.('right')}
            >
              <AlignRight className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="sm"
              className="px-2 h-8"
              tooltip="Justuj"
              onClick={() => onAlignElement?.('justify')}
            >
              <AlignJustify className="w-4 h-4" />
            </TooltipButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Size Controls */}
          <div className="flex items-center gap-0.5">
            <TooltipButton
              variant="ghost"
              size="sm"
              className="px-2 h-8"
              tooltip="Dopasuj do treści"
              onClick={() => onSizeElement?.('fit')}
            >
              <Minimize2 className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="sm"
              className="px-2 h-8"
              tooltip="Pełna szerokość"
              onClick={() => onSizeElement?.('full')}
            >
              <Maximize2 className="w-4 h-4" />
            </TooltipButton>
          </div>
        </>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Right side controls */}
      <div className="flex items-center gap-0.5">
        {/* Preview toggle */}
        <TooltipButton
          variant={isPreviewMode ? 'default' : 'ghost'}
          size="sm"
          onClick={onTogglePreview}
          className="px-2 h-8"
          tooltip={isPreviewMode ? 'Zamknij podgląd' : 'Podgląd'}
        >
          {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </TooltipButton>

        {/* Keyboard shortcuts help */}
        <KeyboardShortcutsHelp className="px-2 h-8" />

        {/* Save button with status */}
        <TooltipButton
          variant={hasUnsavedChanges ? 'default' : 'ghost'}
          size="sm"
          onClick={onSave}
          className={cn(
            "px-2 h-8 gap-1.5",
            autoSaveStatus === 'saving' && "animate-pulse",
            autoSaveStatus === 'error' && "text-destructive"
          )}
          tooltip={
            autoSaveStatus === 'saving' ? 'Zapisywanie...' :
            autoSaveStatus === 'error' ? 'Błąd zapisu' :
            hasUnsavedChanges ? 'Zapisz zmiany' : 'Wszystko zapisane'
          }
          shortcut="Ctrl+S"
        >
          <Save className="w-4 h-4" />
          {autoSaveStatus === 'saving' && (
            <span className="text-xs">...</span>
          )}
        </TooltipButton>
      </div>
    </div>
  );
};
