import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
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
      modifiers={[restrictToWindowEdges]}
    >
      {children}
      <DragOverlay>
        {activeId ? dragOverlay : null}
      </DragOverlay>
    </DndContext>
  );
};