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
        "w-full rounded-lg transition-all duration-200",
        isEditMode && "border-2 border-dashed border-blue-300 bg-blue-50/30 p-4",
        isEditMode && isOver && "border-blue-500 bg-blue-100/50",
        !isEditMode && "border-0"
      )}
    >
      {/* Row controls in edit mode */}
      {isEditMode && (
        <div className="mb-4 p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg border border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Row Container ({columnCount} {columnCount === 1 ? 'column' : 'columns'})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveRow(row.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Columns:</span>
            <Button
              variant={columnCount === 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setColumnCount(1)}
              className="h-8 px-2"
            >
              <Columns className="w-3 h-3" />
              <span className="ml-1 text-xs">1</span>
            </Button>
            <Button
              variant={columnCount === 2 ? "default" : "outline"}
              size="sm"
              onClick={() => setColumnCount(2)}
              className="h-8 px-2"
            >
              <Columns2 className="w-3 h-3" />
              <span className="ml-1 text-xs">2</span>
            </Button>
            <Button
              variant={columnCount === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setColumnCount(3)}
              className="h-8 px-2"
            >
              <Columns3 className="w-3 h-3" />
              <span className="ml-1 text-xs">3</span>
            </Button>
            <Button
              variant={columnCount === 4 ? "default" : "outline"}
              size="sm"
              onClick={() => setColumnCount(4)}
              className="h-8 px-2"
            >
              <Grid3X3 className="w-3 h-3" />
              <span className="ml-1 text-xs">4</span>
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
                  "min-h-[200px] transition-all duration-200",
                  isEditMode && "border-2 border-dashed border-gray-300 rounded-lg p-2",
                  isEditMode && !section && "bg-gray-50/50 dark:bg-gray-800/50",
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
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Drop section here</p>
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