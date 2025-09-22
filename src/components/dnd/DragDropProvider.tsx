import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToWindowEdges,
  restrictToParentElement,
} from '@dnd-kit/modifiers';

interface DragDropProviderProps {
  children: React.ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  items: string[];
  activeId?: string | null;
  dragOverlay?: React.ReactNode;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  onDragStart,
  onDragEnd,
  items,
  activeId,
  dragOverlay,
}) => {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Require 8px movement before drag starts
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      modifiers={[restrictToWindowEdges, restrictToParentElement]}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragOverlay>
        {activeId ? dragOverlay : null}
      </DragOverlay>
    </DndContext>
  );
};