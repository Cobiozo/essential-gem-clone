import React, { useRef } from 'react';
import { useDndMonitor } from '@dnd-kit/core';

export const DndDiagnostics: React.FC = () => {
  const flipCountRef = useRef(0);
  const lastOverIdRef = useRef<string | null>(null);

  useDndMonitor({
    onDragOver(event) {
      const currentOverId = event.over?.id?.toString() || null;
      
      if (lastOverIdRef.current !== currentOverId) {
        flipCountRef.current++;
        console.info('DnD Over change:', {
          from: lastOverIdRef.current,
          to: currentOverId,
          flipCount: flipCountRef.current,
        });
        lastOverIdRef.current = currentOverId;
      }
    },
    onDragEnd(event) {
      console.info('DnD End:', {
        active: event.active?.id,
        over: event.over?.id,
        totalFlips: flipCountRef.current,
      });
      
      // Reset counters
      flipCountRef.current = 0;
      lastOverIdRef.current = null;
    },
  });

  return null; // This component doesn't render anything
};