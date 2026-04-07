import { useRef, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X, Minus, Maximize2, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatSidebar } from '@/contexts/ChatSidebarContext';
import { ChatPanelContent } from './ChatPanelContent';

export const ChatFloatingWindow = () => {
  const { isFloating, close, openDocked, floatingPosition, setFloatingPosition, isMinimized, setMinimized } = useChatSidebar();
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - floatingPosition.x,
      y: e.clientY - floatingPosition.y,
    };
  }, [floatingPosition.x, floatingPosition.y]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(window.innerWidth - floatingPosition.width, e.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragOffset.current.y));
      setFloatingPosition({ x, y });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, floatingPosition.width, setFloatingPosition]);

  if (!isFloating) return null;

  const content = (
    <div
      ref={dragRef}
      className={cn(
        'fixed z-[100] flex flex-col bg-background border border-border rounded-xl shadow-2xl overflow-hidden',
        isDragging && 'select-none'
      )}
      style={{
        left: floatingPosition.x,
        top: floatingPosition.y,
        width: floatingPosition.width,
        height: isMinimized ? 48 : floatingPosition.height,
        transition: isDragging ? 'none' : 'height 0.2s ease',
      }}
    >
      {/* Header - draggable */}
      <div
        className="h-12 px-3 border-b border-border flex items-center justify-between shrink-0 bg-background cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">Czat</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openDocked} title="Tryb sidebar">
            <PanelRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMinimized(!isMinimized)} title={isMinimized ? 'Rozwiń' : 'Minimalizuj'}>
            {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && <ChatPanelContent />}
    </div>
  );

  return createPortal(content, document.body);
};
