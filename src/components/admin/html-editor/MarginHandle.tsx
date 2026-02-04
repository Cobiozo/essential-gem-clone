import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MarginHandleProps {
  currentMargin: string;
  onMarginChange: (newMargin: string) => void;
  isVisible: boolean;
}

export const MarginHandle: React.FC<MarginHandleProps> = ({
  currentMargin,
  onMarginChange,
  isVisible
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [displayMargin, setDisplayMargin] = useState(0);
  const startYRef = useRef(0);
  const startMarginRef = useRef(0);
  
  // Parse margin value to number
  const parseMargin = (margin: string): number => {
    const match = margin.match(/^(-?\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };
  
  useEffect(() => {
    setDisplayMargin(parseMargin(currentMargin));
  }, [currentMargin]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startMarginRef.current = parseMargin(currentMargin);
  }, [currentMargin]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = startYRef.current - e.clientY; // up = positive
    const newMargin = Math.max(0, startMarginRef.current + deltaY);
    setDisplayMargin(newMargin);
  }, [isDragging]);
  
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onMarginChange(`${Math.round(displayMargin)}px`);
    }
  }, [isDragging, displayMargin, onMarginChange]);
  
  // Global mouse events for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(true);
    startYRef.current = touch.clientY;
    startMarginRef.current = parseMargin(currentMargin);
  }, [currentMargin]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaY = startYRef.current - touch.clientY;
    const newMargin = Math.max(0, startMarginRef.current + deltaY);
    setDisplayMargin(newMargin);
  }, [isDragging]);
  
  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onMarginChange(`${Math.round(displayMargin)}px`);
    }
  }, [isDragging, displayMargin, onMarginChange]);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);
  
  if (!isVisible) return null;
  
  return (
    <div
      className={cn(
        "absolute -top-3 left-0 right-0 flex items-center justify-center cursor-ns-resize z-20",
        "group"
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Visual handle bar */}
      <div 
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
          isDragging 
            ? "bg-primary text-primary-foreground shadow-lg scale-110" 
            : "bg-muted/80 text-muted-foreground hover:bg-primary/20 hover:text-primary"
        )}
      >
        <span className="flex items-center gap-0.5">
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4L6 1L9 4" />
            <path d="M3 8L6 11L9 8" />
            <line x1="6" y1="2" x2="6" y2="10" />
          </svg>
          {Math.round(displayMargin)}px
        </span>
      </div>
      
      {/* Drag indicator line (visible only while dragging) */}
      {isDragging && displayMargin > 0 && (
        <div 
          className="absolute left-0 right-0 border-t-2 border-dashed border-primary/50 pointer-events-none"
          style={{ 
            top: `-${displayMargin}px`,
          }}
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
            ↑ {Math.round(displayMargin)}px odstępu
          </div>
        </div>
      )}
    </div>
  );
};
