import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Move, MoreHorizontal, MoreVertical } from 'lucide-react';

interface ResizableElementProps {
  children: React.ReactNode;
  isEditMode: boolean;
  isSelected?: boolean;
  onResize?: (width: number, height: number) => void;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}

export const ResizableElement: React.FC<ResizableElementProps> = ({
  children,
  isEditMode,
  onResize,
  initialWidth,
  initialHeight,
  minWidth = 100,
  minHeight = 50,
  maxWidth = 1200,
  maxHeight = 800,
  className,
}) => {
  const [dimensions, setDimensions] = useState({
    width: initialWidth || 'auto',
    height: initialHeight || 'auto',
  });
  
  // Sync with prop changes (e.g., after saving and refetching from DB)
  useEffect(() => {
    setDimensions({
      width: initialWidth || 'auto',
      height: initialHeight || 'auto',
    });
  }, [initialWidth, initialHeight]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const elementRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const isResizingRef = useRef(false);
  const resizeDirectionRef = useRef<string>('');
  const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    if (!isEditMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    isResizingRef.current = true;
    resizeDirectionRef.current = direction;
    setIsResizing(true);
    setResizeDirection(direction);
    
    const rect = elementRef.current?.getBoundingClientRect();
    if (rect) {
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };
    }
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    console.info('Resize start', { direction });
  }, [isEditMode]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    let newWidth = startPos.current.width;
    let newHeight = startPos.current.height;
    
    const dir = resizeDirectionRef.current;
    
    if (dir.includes('right')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startPos.current.width + deltaX));
    }
    if (dir.includes('left')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startPos.current.width - deltaX));
    }
    if (dir.includes('bottom')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startPos.current.height + deltaY));
    }
    if (dir.includes('top')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startPos.current.height - deltaY));
    }
    
    setDimensions({
      width: newWidth,
      height: newHeight,
    });
    // console.info('Resizing', { newWidth, newHeight, dir });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isResizingRef.current && onResize) {
      const width = typeof dimensions.width === 'number' ? dimensions.width : 0;
      const height = typeof dimensions.height === 'number' ? dimensions.height : 0;
      onResize(width, height);
    }
    
    isResizingRef.current = false;
    resizeDirectionRef.current = '';
    setIsResizing(false);
    setResizeDirection('');
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleTouchMove as any);
    document.removeEventListener('touchend', handleTouchEnd as any);
    console.info('Resize end');
  }, [onResize, dimensions]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizingRef.current) return;
    if (e.touches.length === 0) return;
    const t = e.touches[0];

    const deltaX = t.clientX - startPos.current.x;
    const deltaY = t.clientY - startPos.current.y;

    let newWidth = startPos.current.width;
    let newHeight = startPos.current.height;

    const dir = resizeDirectionRef.current;

    if (dir.includes('right')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startPos.current.width + deltaX));
    }
    if (dir.includes('left')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startPos.current.width - deltaX));
    }
    if (dir.includes('bottom')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startPos.current.height + deltaY));
    }
    if (dir.includes('top')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startPos.current.height - deltaY));
    }

    setDimensions({ width: newWidth, height: newHeight });
  }, []);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, direction: string) => {
    if (!isEditMode) return;
    
    e.preventDefault();
    e.stopPropagation();

    const t = e.touches[0];

    isResizingRef.current = true;
    resizeDirectionRef.current = direction;
    setIsResizing(true);
    setResizeDirection(direction);
    
    const rect = elementRef.current?.getBoundingClientRect();
    if (rect) {
      startPos.current = {
        x: t.clientX,
        y: t.clientY,
        width: rect.width,
        height: rect.height,
      };
    }

    document.addEventListener('touchmove', handleTouchMove as any, { passive: false } as any);
    document.addEventListener('touchend', handleTouchEnd as any);
    console.info('Resize start (touch)', { direction });
  }, [isEditMode]);

  const resetSize = () => {
    setDimensions({
      width: 'auto',
      height: 'auto',
    });
    if (onResize) {
      onResize(0, 0); // Reset to auto - 0 means auto in our system
    }
  };

  if (!isEditMode) {
    return <div className={className}>{children}</div>;
  }

  const style = {
    width: typeof dimensions.width === 'number' ? `${dimensions.width}px` : dimensions.width,
    height: typeof dimensions.height === 'number' ? `${dimensions.height}px` : dimensions.height,
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        "relative group",
        isResizing && "select-none",
        className
      )}
      style={style}
    >
      {children}
      
      {/* Resize handles - only visible on hover or during resize */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
        isResizing && "opacity-100"
      )}>
        {/* Corner handles */}
        <div
          className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nw-resize pointer-events-auto z-20"
          onMouseDown={(e) => handleMouseDown(e, 'top-left')}
          onTouchStart={(e) => handleTouchStart(e, 'top-left')}
        />
        <div
          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-ne-resize pointer-events-auto z-20"
          onMouseDown={(e) => handleMouseDown(e, 'top-right')}
          onTouchStart={(e) => handleTouchStart(e, 'top-right')}
        />
        <div
          className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-sw-resize pointer-events-auto z-20"
          onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
          onTouchStart={(e) => handleTouchStart(e, 'bottom-left')}
        />
        <div
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-se-resize pointer-events-auto z-20"
          onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
          onTouchStart={(e) => handleTouchStart(e, 'bottom-right')}
        />
        
        {/* Edge handles */}
        <div
          className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-blue-500 border border-white rounded-sm cursor-n-resize pointer-events-auto z-20 flex items-center justify-center"
          onMouseDown={(e) => handleMouseDown(e, 'top')}
          onTouchStart={(e) => handleTouchStart(e, 'top')}
        >
          <MoreHorizontal className="w-3 h-3 text-white" />
        </div>
        <div
          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-blue-500 border border-white rounded-sm cursor-s-resize pointer-events-auto z-20 flex items-center justify-center"
          onMouseDown={(e) => handleMouseDown(e, 'bottom')}
          onTouchStart={(e) => handleTouchStart(e, 'bottom')}
        >
          <MoreHorizontal className="w-3 h-3 text-white" />
        </div>
        <div
          className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-blue-500 border border-white rounded-sm cursor-w-resize pointer-events-auto z-20 flex items-center justify-center"
          onMouseDown={(e) => handleMouseDown(e, 'left')}
          onTouchStart={(e) => handleTouchStart(e, 'left')}
        >
          <MoreVertical className="w-3 h-3 text-white" />
        </div>
        <div
          className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-blue-500 border border-white rounded-sm cursor-e-resize pointer-events-auto z-20 flex items-center justify-center"
          onMouseDown={(e) => handleMouseDown(e, 'right')}
          onTouchStart={(e) => handleTouchStart(e, 'right')}
        >
          <MoreVertical className="w-3 h-3 text-white" />
        </div>

        {/* Reset button */}
        <div className="absolute -top-8 -right-1 pointer-events-auto">
          <button
            onClick={resetSize}
            className="bg-gray-600 hover:bg-gray-700 text-white p-1 rounded text-xs flex items-center gap-1"
            title="Reset size"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
        
        {/* Move handle */}
        <div className="absolute -top-8 -left-1 pointer-events-auto">
          <div className="bg-green-500 text-white p-1 rounded text-xs flex items-center gap-1">
            <Move className="w-3 h-3" />
          </div>
        </div>

        {/* Size display */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none">
          {typeof dimensions.width === 'number' ? `${Math.round(dimensions.width)}` : 'auto'} × {typeof dimensions.height === 'number' ? `${Math.round(dimensions.height)}` : 'auto'}
        </div>
      </div>
    </div>
  );
};