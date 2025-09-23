import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, X, Columns, Columns2, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableItem } from './DraggableItem';
import { CMSContent } from '@/components/CMSContent';
import { CMSItem } from '@/types/cms';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number; // percentage
}

interface ColumnLayoutProps {
  sectionId: string;
  columns: Column[];
  isEditMode: boolean;
  onColumnsChange: (columns: Column[]) => void;
  onItemClick?: (title: string, url?: string) => void;
  onSelectItem?: (itemId: string) => void;
  className?: string;
}

export const ColumnLayout: React.FC<ColumnLayoutProps> = ({
  sectionId,
  columns,
  isEditMode,
  onColumnsChange,
  onItemClick,
  onSelectItem,
  className,
}) => {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const addColumn = () => {
    const newColumn: Column = {
      id: `${sectionId}-col-${columns.length}`,
      items: [],
      width: 100 / (columns.length + 1),
    };
    // Redistribute width equally among all columns
    const updatedColumns = columns.map(col => ({
      ...col,
      width: 100 / (columns.length + 1),
    }));
    
    onColumnsChange([...updatedColumns, newColumn]);
  };

  const removeColumn = (columnId: string) => {
    if (columns.length <= 1) return; // Don't remove last column
    
    const columnToRemove = columns.find(col => col.id === columnId);
    const remainingColumns = columns.filter(col => col.id !== columnId);
    
    // Move items from removed column to first remaining column
    if (columnToRemove && columnToRemove.items.length > 0 && remainingColumns.length > 0) {
      remainingColumns[0].items.push(...columnToRemove.items);
    }
    
    // Redistribute width equally
    const updatedColumns = remainingColumns.map(col => ({
      ...col,
      width: 100 / remainingColumns.length,
    }));
    
    onColumnsChange(updatedColumns);
  };

  const setColumnCount = (count: 1 | 2 | 3) => {
    // Collect all items from existing columns
    const allItems = columns.flatMap(col => col.items);
    
    // Create new columns
    const newColumns: Column[] = [];
    for (let i = 0; i < count; i++) {
      newColumns.push({
        id: `${sectionId}-col-${i}`,
        items: i === 0 ? allItems : [], // Put all items in first column
        width: 100 / count,
      });
    }
    
    onColumnsChange(newColumns);
  };

  if (!isEditMode && columns.length === 1) {
    // In view mode, if single column, render items without column wrapper
    const items = columns[0]?.items || [];
    return (
      <div className={cn("space-y-4", className)}>
        {items.map((item) => (
          <CMSContent
            key={item.id}
            item={item}
            onClick={onItemClick || (() => {})}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Column controls in edit mode */}
      {isEditMode && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Columns:</span>
              <Button
                variant={columns.length === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setColumnCount(1)}
                className="p-2"
              >
                <Columns className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">1</span>
              </Button>
              <Button
                variant={columns.length === 2 ? "default" : "outline"}
                size="sm"
                onClick={() => setColumnCount(2)}
                className="p-2"
              >
                <Columns2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">2</span>
              </Button>
              <Button
                variant={columns.length === 3 ? "default" : "outline"}
                size="sm"
                onClick={() => setColumnCount(3)}
                className="p-2"
              >
                <Columns3 className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">3</span>
              </Button>
            </div>
            
            {columns.length < 4 && (
              <Button
                variant="outline"
                size="sm"
                onClick={addColumn}
                className="gap-1 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Column</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Columns container */}
      <div className={cn(
        "grid gap-4",
        columns.length === 1 && "grid-cols-1",
        columns.length === 2 && "grid-cols-1 sm:grid-cols-2",
        columns.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns.length >= 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {columns.map((column, index) => (
          <ColumnDropZone
            key={column.id}
            sectionId={sectionId}
            column={column}
            isEditMode={isEditMode}
            canRemove={columns.length > 1}
            onRemove={() => removeColumn(column.id)}
            onItemClick={onItemClick}
            isDragOver={dragOverColumn === column.id}
            onDragOver={(isDragging) => {
              setDragOverColumn(isDragging ? column.id : null);
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface ColumnDropZoneProps {
  sectionId: string;
  column: Column;
  isEditMode: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onItemClick?: (title: string, url?: string) => void;
  isDragOver: boolean;
  onDragOver: (isDragging: boolean) => void;
}

const ColumnDropZone: React.FC<ColumnDropZoneProps> = ({
  sectionId,
  column,
  isEditMode,
  canRemove,
  onRemove,
  onItemClick,
  isDragOver,
  onDragOver,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      sectionId,
      columnIndex: parseInt(column.id.split('-col-')[1]),
    },
  });

  React.useEffect(() => {
    onDragOver(isOver);
  }, [isOver, onDragOver]);

  const itemIds = column.items.map(item => item.id || '');

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] p-3 rounded-lg transition-all duration-200",
        isEditMode && "border-2 border-dashed",
        isEditMode && !isDragOver && "border-gray-300 bg-gray-50/50 dark:bg-gray-800/50",
        isEditMode && isDragOver && "border-blue-400 bg-blue-50 dark:bg-blue-950/20",
        !isEditMode && "bg-background"
      )}
    >
      {/* Column header in edit mode */}
      {isEditMode && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Column {column.id.split('-col-')[1] ? parseInt(column.id.split('-col-')[1]) + 1 : 1}
          </span>
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Items in column */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {column.items.length === 0 && isEditMode && (
            <div className="text-center py-8 text-gray-400">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Drop items here</p>
            </div>
          )}
          
{column.items.map((item) => (
  <div key={item.id} onClick={() => onSelectItem?.(item.id || '')}>
    <DraggableItem
      id={item.id || ''}
      isEditMode={isEditMode}
    >
      <CMSContent
        item={item}
        onClick={onItemClick || (() => {})}
      />
    </DraggableItem>
  </div>
))}
        </div>
      </SortableContext>
    </div>
  );
};