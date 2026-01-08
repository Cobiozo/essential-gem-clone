import { useState, useRef, useEffect, useCallback } from 'react';
import { Users, Minimize2, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPresenceWidget } from './AdminPresenceWidget';
import type { AdminPresence } from '@/hooks/useAdminPresence';
import { cn } from '@/lib/utils';

interface FloatingAdminPresenceProps {
  admins: AdminPresence[];
  currentUserPresence?: AdminPresence | null;
  isConnected: boolean;
}

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = 'admin-presence-position';
const DEFAULT_POSITION: Position = { x: 16, y: 16 };

const getInitialPosition = (): Position => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_POSITION;
};

export const FloatingAdminPresence = ({
  admins,
  currentUserPresence,
  isConnected,
}: FloatingAdminPresenceProps) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [position, setPosition] = useState<Position>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  const totalCount = admins.length + (currentUserPresence ? 1 : 0);

  // Clamp position to viewport bounds
  const clampPosition = useCallback((x: number, y: number): Position => {
    const element = dragRef.current;
    if (!element) return { x, y };
    
    const rect = element.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }, []);

  // Save position to localStorage
  const savePosition = useCallback((pos: Position) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // ignore storage errors
    }
  }, []);

  // Handle drag start (mouse & touch)
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  }, [position]);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;
      
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = dragStartRef.current.y - clientY;
      
      const newX = dragStartRef.current.posX + deltaX;
      const newY = dragStartRef.current.posY + deltaY;
      
      setPosition(clampPosition(newX, newY));
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      savePosition(position);
    };

    // Add listeners
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, clampPosition, savePosition, position]);

  // Recalculate bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  if (isMinimized) {
    return (
      <div 
        ref={dragRef}
        className="fixed z-50"
        style={{ left: position.x, bottom: position.y }}
      >
        <div className="flex items-center gap-1">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsMinimized(false)}
            className="gap-2 shadow-lg rounded-r-none"
          >
            <Users className="h-4 w-4" />
            <span className="font-medium">{totalCount}</span>
            <Maximize2 className="h-3 w-3 ml-1" />
          </Button>
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={cn(
              "p-1 cursor-grab active:cursor-grabbing rounded-r-md bg-primary text-primary-foreground touch-none",
              isDragging && "cursor-grabbing"
            )}
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={dragRef}
      className={cn(
        "fixed z-50 w-72 animate-in slide-in-from-bottom-2 duration-200",
        isDragging && "select-none"
      )}
      style={{ left: position.x, bottom: position.y }}
    >
      <div className="relative">
        {/* Drag handle */}
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className={cn(
            "absolute -right-6 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing rounded-r-md bg-muted border border-l-0 shadow-sm touch-none",
            isDragging && "cursor-grabbing bg-muted/80"
          )}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(true)}
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted hover:bg-muted/80 shadow-sm z-10"
        >
          <Minimize2 className="h-3 w-3" />
        </Button>
        <AdminPresenceWidget
          admins={admins}
          currentUserPresence={currentUserPresence}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
};
