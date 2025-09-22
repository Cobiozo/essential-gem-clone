import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Move,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  className?: string;
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
  className,
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50",
      "bg-white dark:bg-gray-800 border border-border rounded-lg shadow-xl",
      "flex items-center gap-2 px-4 py-2",
      "animate-fade-in",
      className
    )}>
      {/* Layout Mode Controls */}
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-xs">
          Layout
        </Badge>
        <Button
          variant={layoutMode === 'single' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutModeChange('single')}
          className="px-2"
          title="Single Column"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          variant={layoutMode === 'columns' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutModeChange('columns')}
          className="px-2"
          title="Multiple Columns"
        >
          <Columns className="w-4 h-4" />
        </Button>
        <Button
          variant={layoutMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLayoutModeChange('grid')}
          className="px-2"
          title="Grid Layout"
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Column Count Controls (when in columns mode) */}
      {layoutMode === 'columns' && (
        <>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              Columns
            </Badge>
            <Button
              variant={columnCount === 1 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onColumnCountChange(1)}
              className="px-2"
            >
              <Columns className="w-4 h-4" />
            </Button>
            <Button
              variant={columnCount === 2 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onColumnCountChange(2)}
              className="px-2"
            >
              <Columns2 className="w-4 h-4" />
            </Button>
            <Button
              variant={columnCount === 3 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onColumnCountChange(3)}
              className="px-2"
            >
              <Columns3 className="w-4 h-4" />
            </Button>
            <Button
              variant={columnCount === 4 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onColumnCountChange(4)}
              className="px-2"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Element Controls (when element is selected) */}
      {selectedElement && (
        <>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              Selected: {selectedElement}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDuplicateElement}
              className="px-2"
              title="Duplicate Element"
            >
              <Copy className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetElement}
              className="px-2"
              title="Reset Size"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onElementSettings}
              className="px-2"
              title="Element Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteElement}
              className="px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Delete Element"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Alignment Controls */}
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-xs">
          Align
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Size Controls */}
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-xs">
          Size
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          title="Fit Content"
        >
          <Minimize2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          title="Full Width"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};