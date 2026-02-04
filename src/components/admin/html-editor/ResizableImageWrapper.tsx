import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ResizableImageWrapperProps {
  children: React.ReactNode;
  isSelected: boolean;
  isEditMode: boolean;
  currentWidth?: string;
  currentHeight?: string;
  onResize: (width: string, height: string) => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export const ResizableImageWrapper: React.FC<ResizableImageWrapperProps> = ({
  children,
  isSelected,
  isEditMode,
  currentWidth,
  currentHeight,
  onResize
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!wrapperRef.current) return;
    
    const rect = wrapperRef.current.getBoundingClientRect();
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: rect.width, height: rect.height };
    
    setIsResizing(true);
    setActiveHandle(handle);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !activeHandle) return;
    
    const deltaX = e.clientX - startPos.current.x;
    
    // Calculate aspect ratio from starting dimensions
    const aspectRatio = startSize.current.width / startSize.current.height;
    
    let newWidth = startSize.current.width;
    let newHeight = startSize.current.height;
    
    // Use width as primary dimension and maintain aspect ratio
    switch (activeHandle) {
      case 'se':
      case 'ne':
        // Right corners - add deltaX to width
        newWidth = Math.max(20, startSize.current.width + deltaX);
        newHeight = newWidth / aspectRatio;
        break;
      case 'sw':
      case 'nw':
        // Left corners - subtract deltaX from width
        newWidth = Math.max(20, startSize.current.width - deltaX);
        newHeight = newWidth / aspectRatio;
        break;
    }
    
    // Ensure minimum height
    newHeight = Math.max(20, newHeight);
    
    // Apply to wrapper for visual feedback
    if (wrapperRef.current) {
      wrapperRef.current.style.width = `${newWidth}px`;
      wrapperRef.current.style.height = `${newHeight}px`;
    }
  }, [isResizing, activeHandle]);
  
  const handleMouseUp = useCallback(() => {
    if (isResizing && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      onResize(`${Math.round(rect.width)}px`, `${Math.round(rect.height)}px`);
    }
    setIsResizing(false);
    setActiveHandle(null);
  }, [isResizing, onResize]);
  
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  const showHandles = isSelected && isEditMode && !isResizing;
  
  const handleCursors: Record<ResizeHandle, string> = {
    nw: 'nw-resize',
    ne: 'ne-resize',
    sw: 'sw-resize',
    se: 'se-resize'
  };
  
  const handlePositions: Record<ResizeHandle, string> = {
    nw: '-top-1.5 -left-1.5',
    ne: '-top-1.5 -right-1.5',
    sw: '-bottom-1.5 -left-1.5',
    se: '-bottom-1.5 -right-1.5'
  };
  
  return (
    <div 
      ref={wrapperRef}
      className={cn(
        'relative inline-block',
        isResizing && 'select-none'
      )}
      style={{
        width: currentWidth || 'auto',
        height: currentHeight || 'auto'
      }}
    >
      {children}
      
      {/* Resize handles */}
      {showHandles && (
        <>
          {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => (
            <div
              key={handle}
              className={cn(
                'absolute w-3 h-3 bg-primary border-2 border-background rounded-sm z-20',
                'hover:bg-primary/80 transition-colors',
                handlePositions[handle]
              )}
              style={{ cursor: handleCursors[handle] }}
              onMouseDown={(e) => handleMouseDown(e, handle)}
            />
          ))}
        </>
      )}
      
      {/* Resize indicator */}
      {isResizing && wrapperRef.current && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-30">
          {Math.round(wrapperRef.current.getBoundingClientRect().width)} × {Math.round(wrapperRef.current.getBoundingClientRect().height)}
        </div>
      )}
    </div>
  );
};
