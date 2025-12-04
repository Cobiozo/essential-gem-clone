import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, X, Columns, Columns2, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableItem } from './DraggableItem';
import { CMSContent } from '@/components/CMSContent';
import { CMSItem } from '@/types/cms';
import { ItemControls } from './ItemControls';
import { LearnMoreItem } from '@/components/homepage/LearnMoreItem';
import { InfoTextItem } from '@/components/homepage/InfoTextItem';

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
  activeId?: string | null;
  renderVersion?: number;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onMoveItemUp?: (itemId: string) => void;
  onMoveItemDown?: (itemId: string) => void;
  displayType?: string | null;
}

export const ColumnLayout: React.FC<ColumnLayoutProps> = ({
  sectionId,
  columns,
  isEditMode,
  onColumnsChange,
  onItemClick,
  onSelectItem,
  className,
  activeId,
  renderVersion,
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onMoveItemUp,
  onMoveItemDown,
  displayType,
}) => {
  

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
    <div className={cn("w-full group/columns", className)}>
      {/* Column controls in edit mode - visible only on hover */}
      {isEditMode && (
        <div className="mb-4 p-2 bg-muted/50 rounded-lg border border-dashed border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Kolumny:</span>
            <Button
              variant={columns.length === 1 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnCount(1)}
              className="h-7 w-7 p-0"
            >
              <Columns className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={columns.length === 2 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnCount(2)}
              className="h-7 w-7 p-0"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={columns.length === 3 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnCount(3)}
              className="h-7 w-7 p-0"
            >
              <Columns3 className="w-3.5 h-3.5" />
            </Button>
            {columns.length < 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={addColumn}
                className="h-7 px-2 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs">Dodaj</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Columns container */}
      <div className={cn(
        "grid gap-4 w-full",
        columns.length === 1 && "grid-cols-1",
        columns.length === 2 && "grid-cols-1 lg:grid-cols-2",
        columns.length === 3 && "grid-cols-1 lg:grid-cols-3",
        columns.length >= 4 && "grid-cols-1 lg:grid-cols-2 xl:grid-cols-4"
      )}>
        {columns.map((column) => (
          <ColumnDropZone
            key={column.id}
            sectionId={sectionId}
            column={column}
            isEditMode={isEditMode}
            canRemove={columns.length > 1}
            onRemove={() => removeColumn(column.id)}
            onItemClick={onItemClick}
            onSelectItem={onSelectItem}
            activeId={activeId}
            renderVersion={renderVersion}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
            onDuplicateItem={onDuplicateItem}
            onMoveItemUp={onMoveItemUp}
            onMoveItemDown={onMoveItemDown}
            displayType={displayType}
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
  onSelectItem?: (itemId: string) => void;
  activeId?: string | null;
  renderVersion?: number;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onMoveItemUp?: (itemId: string) => void;
  onMoveItemDown?: (itemId: string) => void;
  displayType?: string | null;
}

const ColumnDropZone: React.FC<ColumnDropZoneProps> = ({
  sectionId,
  column,
  isEditMode,
  canRemove,
  onRemove,
  onItemClick,
  onSelectItem,
  activeId,
  renderVersion,
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onMoveItemUp,
  onMoveItemDown,
  displayType,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      sectionId,
      columnIndex: parseInt(column.id.split('-col-')[1]),
    },
    disabled: !isEditMode,
  });
  const itemIds = React.useMemo(() => (
    column.items
      .map((item) => item.id)
      .filter(Boolean) as string[]
  ), [column.items]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] p-3 rounded-lg transition-all duration-200",
        isEditMode && "border border-dashed",
        isEditMode && !isOver && "border-border bg-muted/50",
        isEditMode && isOver && "border-border bg-primary/10 ring-2 ring-primary",
        !isEditMode && "bg-background"
      )}
    >
      {/* Column header in edit mode */}
      {isEditMode && (
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/30">
          <span className="text-xs font-medium text-muted-foreground">
            Kolumna {column.id.split('-col-')[1] ? parseInt(column.id.split('-col-')[1]) + 1 : 1}
          </span>
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {/* Items in column */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {column.items.length === 0 && isEditMode && (
            <div className="text-center py-6 text-muted-foreground/60">
              <Plus className="w-6 h-6 mx-auto mb-1 opacity-40" />
              <p className="text-xs">Upuść elementy tutaj</p>
            </div>
          )}
          
{column.items.filter((item) => !!item.id).map((item, itemIdx) => {
  // Special rendering for info_text in grid display
  let itemContent;
  if (item.type === 'info_text' && displayType === 'grid') {
    itemContent = <InfoTextItem item={item} />;
  } else if (item.type === 'multi_cell') {
    // Special rendering for multi_cell items (Learn More section)
    itemContent = (
      <LearnMoreItem 
        item={item} 
        itemIndex={itemIdx}
        isExpanded={false}
        onToggle={() => {}}
      />
    );
  } else {
    itemContent = (
      <CMSContent
        item={item}
        onClick={onItemClick || (() => {})}
      />
    );
  }
  
  if (isEditMode) {
    return (
      <DraggableItem
        key={`${item.id}-${renderVersion || 0}`}
        id={item.id as string}
        isEditMode={isEditMode}
      >
        <div 
          className="relative group"
          onClick={(e) => {
            e.stopPropagation();
            if (!activeId) {
              onSelectItem?.(item.id || '');
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEditItem?.(item.id as string);
          }}
        >
          {/* ItemControls dla elementów w wierszach */}
          {onDeleteItem && (
            <ItemControls
              onEdit={() => onEditItem?.(item.id as string)}
              onDelete={() => onDeleteItem(item.id as string)}
              onDuplicate={onDuplicateItem ? () => onDuplicateItem(item.id as string) : undefined}
            />
          )}
          {itemContent}
        </div>
      </DraggableItem>
    );
  } else {
    return (
      <div key={item.id}>
        {itemContent}
      </div>
    );
  }
})}
        </div>
      </SortableContext>
    </div>
  );
};