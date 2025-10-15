import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';

interface DragDropProviderProps {
  children: React.ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  items: string[];
  activeId?: string | null;
  dragOverlay?: React.ReactNode;
  disabled?: boolean;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  items,
  activeId,
  dragOverlay,
  disabled = false,
}) => {
  const pointerOptions = React.useMemo(() => ({
    activationConstraint: {
      distance: 8,
    },
  }), []);
  const pointerSensor = useSensor(PointerSensor, pointerOptions);
  
  // Optimized touch sensor for mobile - reduced delay, increased tolerance
  const touchOptions = React.useMemo(() => ({
    activationConstraint: {
      delay: 50, // Zmniejszony delay dla lepszej responsywności
      tolerance: 10, // Większa tolerancja dla łatwiejszego chwytania
    },
  }), []);
  const touchSensor = useSensor(TouchSensor, touchOptions);

  const sensors = useSensors(pointerSensor, touchSensor);
 
  const modifiers = React.useMemo(() => [restrictToWindowEdges], []);
  const measuringConfig = React.useMemo(() => ({
    droppable: { strategy: MeasuringStrategy.BeforeDragging },
  }), []);
 
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      modifiers={modifiers}
      measuring={measuringConfig}
      autoScroll={{ threshold: { x: 0.2, y: 0.2 } }}
    >
      {children}
    </DndContext>
  );
};