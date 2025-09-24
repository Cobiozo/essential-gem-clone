import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, X, Columns, Columns2, Columns3, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CMSSection, CMSItem } from '@/types/cms';
import { DraggableSection } from './DraggableSection';
import { ResizableElement } from './ResizableElement';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { ColumnLayout } from './ColumnLayout';

interface RowContainerProps {
  row: CMSSection;
  sections: CMSSection[];
  isEditMode: boolean;
  onUpdateRow: (rowId: string, updates: Partial<CMSSection>) => void;
  onRemoveRow: (rowId: string) => void;
  onSelectSection?: (sectionId: string) => void;
  selectedElement?: string;
  items: CMSItem[];
  sectionColumns: { [sectionId: string]: any[] };
  onColumnsChange: (sectionId: string, columns: any[]) => void;
  onElementResize: (sectionId: string, width: number, height: number) => void;
  activeId?: string | null;
  openStates?: Record<string, boolean>;
  onOpenChange?: (id: string, open: boolean) => void;
}

export const RowContainer: React.FC<RowContainerProps> = ({
  row,
  sections,
  isEditMode,
  onUpdateRow,
  onRemoveRow,
  onSelectSection,
  selectedElement,
  items,
  sectionColumns,
  onColumnsChange,
  onElementResize,
  activeId,
  openStates,
  onOpenChange,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `row-${row.id}`,
    data: {
      type: 'row-container',
      rowId: row.id,
    },
    disabled: !isEditMode,
  });

  const rawChildSections = sections.filter(s => s.parent_id === row.id);
  const columnCount = row.row_column_count || 1;

  // Sort children by position and assign to fixed column slots
  const childSections = [...rawChildSections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const slotSections: (CMSSection | undefined)[] = Array.from({ length: columnCount }, () => undefined);
  childSections.forEach((child) => {
    const pos = typeof child.position === 'number' ? child.position : 0;
    if (pos >= 0 && pos < columnCount && !slotSections[pos]) {
      slotSections[pos] = child;
    } else {
      const freeIndex = slotSections.findIndex((s) => !s);
      if (freeIndex !== -1) slotSections[freeIndex] = child;
    }
  });
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
    const sec = slotSections[index];
    if (row.row_layout_type === 'custom' && sec?.custom_width) {
      return `${sec.custom_width}px`;
    }
    return 'auto';
  };

  const DropZone = ({ columnIndex }: { columnIndex: number }) => {
    const { setNodeRef: setDropRef, isOver: isColumnOver } = useDroppable({
      id: `${row.id}-col-${columnIndex}`,
      data: {
        type: 'row-column',
        rowId: row.id,
        columnIndex,
      },
      disabled: !isEditMode,
    });

    return (
      <div
        ref={setDropRef}
        className={cn(
          "min-h-[120px] transition-all duration-200",
          isEditMode && "border border-dashed border-border/30 rounded p-2",
          isEditMode && isColumnOver && "bg-primary/10 ring-2 ring-primary",
          isEditMode && slotSections[columnIndex] && "border-transparent"
        )}
        style={{
          width: row.row_layout_type === 'custom' ? getColumnWidth(columnIndex) : undefined,
        }}
      >
        {slotSections[columnIndex] ? (
          <div onClick={(e) => {
            // Ignore clicks during drag operations  
            if (activeId) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            onSelectSection?.(slotSections[columnIndex]!.id);
          }}>
            {isEditMode ? (
              <ResizableElement
                isSelected={selectedElement === slotSections[columnIndex]!.id}
                isEditMode={isEditMode}
                onResize={(width, height) => onElementResize(slotSections[columnIndex]!.id, width, height)}
              >
                <DraggableSection
                  id={slotSections[columnIndex]!.id}
                  isEditMode={isEditMode}
                  className="h-full"
                >
                  <CollapsibleSection
                    title={slotSections[columnIndex]!.title}
                    description={slotSections[columnIndex]!.description}
                    sectionStyle={{
                      background_color: slotSections[columnIndex]!.background_color,
                      text_color: slotSections[columnIndex]!.text_color,
                      font_size: slotSections[columnIndex]!.font_size,
                      alignment: slotSections[columnIndex]!.alignment,
                      padding: slotSections[columnIndex]!.padding,
                      margin: slotSections[columnIndex]!.margin,
                      border_radius: slotSections[columnIndex]!.border_radius,
                      style_class: slotSections[columnIndex]!.style_class,
                      background_gradient: slotSections[columnIndex]!.background_gradient,
                      border_width: slotSections[columnIndex]!.border_width,
                      border_color: slotSections[columnIndex]!.border_color,
                      border_style: slotSections[columnIndex]!.border_style,
                      box_shadow: slotSections[columnIndex]!.box_shadow,
                      opacity: slotSections[columnIndex]!.opacity,
                      width_type: slotSections[columnIndex]!.width_type,
                      custom_width: slotSections[columnIndex]!.custom_width,
                      height_type: slotSections[columnIndex]!.height_type,
                      custom_height: slotSections[columnIndex]!.custom_height,
                      max_width: slotSections[columnIndex]!.max_width,
                      font_weight: slotSections[columnIndex]!.font_weight,
                      line_height: slotSections[columnIndex]!.line_height,
                      letter_spacing: slotSections[columnIndex]!.letter_spacing,
                      text_transform: slotSections[columnIndex]!.text_transform,
                      display_type: slotSections[columnIndex]!.display_type,
                      justify_content: slotSections[columnIndex]!.justify_content,
                      align_items: slotSections[columnIndex]!.align_items,
                      gap: slotSections[columnIndex]!.gap,
                      section_margin_top: slotSections[columnIndex]!.section_margin_top,
                      section_margin_bottom: slotSections[columnIndex]!.section_margin_bottom,
                      background_image: slotSections[columnIndex]!.background_image,
                      background_image_opacity: slotSections[columnIndex]!.background_image_opacity,
                      background_image_position: slotSections[columnIndex]!.background_image_position,
                      background_image_size: slotSections[columnIndex]!.background_image_size,
                      icon_name: slotSections[columnIndex]!.icon_name,
                      icon_position: slotSections[columnIndex]!.icon_position,
                      icon_size: slotSections[columnIndex]!.icon_size,
                      icon_color: slotSections[columnIndex]!.icon_color,
                      show_icon: slotSections[columnIndex]!.show_icon,
                      min_height: slotSections[columnIndex]!.min_height,
                      hover_opacity: slotSections[columnIndex]!.hover_opacity,
                      hover_scale: slotSections[columnIndex]!.hover_scale,
                      hover_transition_duration: slotSections[columnIndex]!.hover_transition_duration,
                      hover_background_color: slotSections[columnIndex]!.hover_background_color,
                      hover_background_gradient: slotSections[columnIndex]!.hover_background_gradient,
                      hover_text_color: slotSections[columnIndex]!.hover_text_color,
                      hover_border_color: slotSections[columnIndex]!.hover_border_color,
                      hover_box_shadow: slotSections[columnIndex]!.hover_box_shadow,
                      content_direction: slotSections[columnIndex]!.content_direction,
                      content_wrap: slotSections[columnIndex]!.content_wrap,
                      overflow_behavior: slotSections[columnIndex]!.overflow_behavior
                    }}
                    nestedItems={[]}
                     defaultOpen={false}
                     disableToggle={!!activeId}
                     isOpen={!!openStates?.[slotSections[columnIndex]!.id]}
                     onOpenChange={(o) => onOpenChange?.(slotSections[columnIndex]!.id, o)}
                  >
                    <ColumnLayout
                      sectionId={slotSections[columnIndex]!.id}
                      columns={sectionColumns[slotSections[columnIndex]!.id] || [{
                        id: `${slotSections[columnIndex]!.id}-col-0`,
                        items: items.filter(item => item.section_id === slotSections[columnIndex]!.id),
                        width: 100,
                      }]}
                      isEditMode={isEditMode}
                      onColumnsChange={(newColumns) => onColumnsChange(slotSections[columnIndex]!.id, newColumns)}
                      onItemClick={() => {}}
                      onSelectItem={(itemId) => onSelectSection?.(itemId)}
                      activeId={activeId}
                    />
                  </CollapsibleSection>
                </DraggableSection>
              </ResizableElement>
            ) : (
              <CollapsibleSection
                title={slotSections[columnIndex]!.title}
                description={slotSections[columnIndex]!.description}
                sectionStyle={{
                  background_color: slotSections[columnIndex]!.background_color,
                  text_color: slotSections[columnIndex]!.text_color,
                  font_size: slotSections[columnIndex]!.font_size,
                  alignment: slotSections[columnIndex]!.alignment,
                  padding: slotSections[columnIndex]!.padding,
                  margin: slotSections[columnIndex]!.margin,
                  border_radius: slotSections[columnIndex]!.border_radius,
                  style_class: slotSections[columnIndex]!.style_class,
                  background_gradient: slotSections[columnIndex]!.background_gradient,
                  border_width: slotSections[columnIndex]!.border_width,
                  border_color: slotSections[columnIndex]!.border_color,
                  border_style: slotSections[columnIndex]!.border_style,
                  box_shadow: slotSections[columnIndex]!.box_shadow,
                  opacity: slotSections[columnIndex]!.opacity,
                  width_type: slotSections[columnIndex]!.width_type,
                  custom_width: slotSections[columnIndex]!.custom_width,
                  height_type: slotSections[columnIndex]!.height_type,
                  custom_height: slotSections[columnIndex]!.custom_height,
                  max_width: slotSections[columnIndex]!.max_width,
                  font_weight: slotSections[columnIndex]!.font_weight,
                  line_height: slotSections[columnIndex]!.line_height,
                  letter_spacing: slotSections[columnIndex]!.letter_spacing,
                  text_transform: slotSections[columnIndex]!.text_transform,
                  display_type: slotSections[columnIndex]!.display_type,
                  justify_content: slotSections[columnIndex]!.justify_content,
                  align_items: slotSections[columnIndex]!.align_items,
                  gap: slotSections[columnIndex]!.gap,
                  section_margin_top: slotSections[columnIndex]!.section_margin_top,
                  section_margin_bottom: slotSections[columnIndex]!.section_margin_bottom,
                  background_image: slotSections[columnIndex]!.background_image,
                  background_image_opacity: slotSections[columnIndex]!.background_image_opacity,
                  background_image_position: slotSections[columnIndex]!.background_image_position,
                  background_image_size: slotSections[columnIndex]!.background_image_size,
                  icon_name: slotSections[columnIndex]!.icon_name,
                  icon_position: slotSections[columnIndex]!.icon_position,
                  icon_size: slotSections[columnIndex]!.icon_size,
                  icon_color: slotSections[columnIndex]!.icon_color,
                  show_icon: slotSections[columnIndex]!.show_icon,
                  min_height: slotSections[columnIndex]!.min_height,
                  hover_opacity: slotSections[columnIndex]!.hover_opacity,
                  hover_scale: slotSections[columnIndex]!.hover_scale,
                  hover_transition_duration: slotSections[columnIndex]!.hover_transition_duration,
                  hover_background_color: slotSections[columnIndex]!.hover_background_color,
                  hover_background_gradient: slotSections[columnIndex]!.hover_background_gradient,
                  hover_text_color: slotSections[columnIndex]!.hover_text_color,
                  hover_border_color: slotSections[columnIndex]!.hover_border_color,
                  hover_box_shadow: slotSections[columnIndex]!.hover_box_shadow,
                  content_direction: slotSections[columnIndex]!.content_direction,
                  content_wrap: slotSections[columnIndex]!.content_wrap,
                  overflow_behavior: slotSections[columnIndex]!.overflow_behavior
                }}
                nestedItems={[]}
                defaultOpen={false}
                disableToggle={!!activeId}
                isOpen={!!openStates?.[slotSections[columnIndex]!.id]}
                onOpenChange={(o) => onOpenChange?.(slotSections[columnIndex]!.id, o)}
              >
                <ColumnLayout
                  sectionId={slotSections[columnIndex]!.id}
                  columns={sectionColumns[slotSections[columnIndex]!.id] || [{
                    id: `${slotSections[columnIndex]!.id}-col-0`,
                    items: items.filter(item => item.section_id === slotSections[columnIndex]!.id),
                    width: 100,
                  }]}
                  isEditMode={isEditMode}
                  onColumnsChange={(newColumns) => onColumnsChange(slotSections[columnIndex]!.id, newColumns)}
                  onItemClick={() => {}}
                  onSelectItem={(itemId) => onSelectSection?.(itemId)}
                  activeId={activeId}
                />
              </CollapsibleSection>
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
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full transition-all duration-200",
        isEditMode && isOver && "bg-primary/5 ring-2 ring-primary rounded-lg"
      )}
    >
      {/* Row controls in edit mode */}
      {isEditMode && (
        <div className="mb-2 p-2 bg-transparent border border-border/20 rounded">
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
          {Array.from({ length: columnCount }, (_, index) => (
            <DropZone key={`col-${index}`} columnIndex={index} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};