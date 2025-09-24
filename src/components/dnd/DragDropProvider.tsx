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
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 4, // Require 4px movement before drag starts
    },
  });
  
  // Improved touch sensor for mobile devices
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 80,
      tolerance: 6,
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor);
 
  const modifiers = React.useMemo(() => [restrictToWindowEdges], []);
 
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
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.WhileDragging,
        },
      }}
    >
      {children}
    </DndContext>
  );
};