import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, X, Columns, Columns2, Columns3, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CMSSection } from '@/types/cms';
import { DraggableSection } from './DraggableSection';
import { ResizableElement } from './ResizableElement';

interface RowContainerProps {
  row: CMSSection;
  sections: CMSSection[];
  isEditMode: boolean;
  onUpdateRow: (rowId: string, updates: Partial<CMSSection>) => void;
  onRemoveRow: (rowId: string) => void;
  onSelectSection?: (sectionId: string) => void;
  selectedElement?: string;
  children: React.ReactNode;
}

export const RowContainer: React.FC<RowContainerProps> = ({
  row,
  sections,
  isEditMode,
  onUpdateRow,
  onRemoveRow,
  onSelectSection,
  selectedElement,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `row-${row.id}`,
    data: {
      type: 'row-container',
      rowId: row.id,
    },
  });

  const childSections = sections.filter(s => s.parent_id === row.id);
  const columnCount = row.row_column_count || 1;

  const setColumnCount = (count: 1 | 2 | 3 | 4) => {
    onUpdateRow(row.id, { row_column_count: count });
  };

  const getGridClass = () => {
    switch (columnCount) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      default: return 'grid-cols-1';
    }
  };

  const getColumnWidth = (index: number) => {
    if (row.row_layout_type === 'custom' && childSections[index]?.custom_width) {
      return `${childSections[index].custom_width}px`;
    }
    return 'auto';
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full transition-all duration-200",
        isEditMode && "p-2",
        isEditMode && isOver && "bg-primary/5 rounded-lg",
        !isEditMode && "border-0"
      )}
    >
      {/* Row controls in edit mode */}
      {isEditMode && (
        <div className="mb-2 p-2 bg-background/80 backdrop-blur-sm rounded border border-border/30 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Row ({columnCount} {columnCount === 1 ? 'col' : 'cols'})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveRow(row.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant={columnCount === 1 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnCount(1)}
              className="h-6 px-2"
            >
              <Columns className="w-3 h-3" />
            </Button>
            <Button
              variant={columnCount === 2 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnCount(2)}
              className="h-6 px-2"
            >
              <Columns2 className="w-3 h-3" />
            </Button>
            <Button
              variant={columnCount === 3 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnCount(3)}
              className="h-6 px-2"
            >
              <Columns3 className="w-3 h-3" />
            </Button>
            <Button
              variant={columnCount === 4 ? "default" : "ghost"}
              size="sm"
              onClick={() => setColumnCount(4)}
              className="h-6 px-2"
            >
              <Grid3X3 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Grid layout for sections */}
      <div className={cn("grid gap-4", getGridClass())}>
        <SortableContext items={childSections.map(s => s.id)} strategy={horizontalListSortingStrategy}>
          {Array.from({ length: columnCount }, (_, index) => {
            const section = childSections[index];
            
            return (
              <div
                key={`col-${index}`}
                className={cn(
                  "min-h-[120px] transition-all duration-200",
                  isEditMode && "border border-dashed border-border/30 rounded p-2",
                  isEditMode && !section && "bg-muted/20",
                  isEditMode && section && "border-transparent"
                )}
                style={{
                  width: row.row_layout_type === 'custom' ? getColumnWidth(index) : undefined,
                }}
              >
                {section ? (
                  <div onClick={() => onSelectSection?.(section.id)}>
                    {isEditMode ? (
                    <ResizableElement
                      isSelected={selectedElement === section.id}
                      isEditMode={isEditMode}
                      onResize={(width, height) => {
                        onUpdateRow(section.id, {
                          custom_width: width,
                          custom_height: height,
                          row_layout_type: 'custom'
                        });
                      }}
                    >
                        <DraggableSection
                          id={section.id}
                          isEditMode={isEditMode}
                          className="h-full"
                        >
                          {children}
                        </DraggableSection>
                      </ResizableElement>
                    ) : (
                      children
                    )}
                  </div>
                ) : (
                  isEditMode && (
                    <div className="flex items-center justify-center h-full text-muted-foreground/60">
                      <div className="text-center">
                        <Plus className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Drop section here</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
};