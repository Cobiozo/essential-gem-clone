import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, X, Columns, Columns2, Columns3, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CMSSection, CMSItem } from '@/types/cms';
import { DraggableSection } from './DraggableSection';
import { ResizableElement } from './ResizableElement';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { ColumnLayout } from './ColumnLayout';

// Extracted to avoid re-mount loops of inline components causing DnD measuring cascades
interface RowColumnDropZoneProps {
  rowId: string;
  columnIndex: number;
  isEditMode: boolean;
  slotSection?: CMSSection;
  selectedElement?: string;
  onSelectSection?: (sectionId: string) => void;
  onElementResize: (sectionId: string, width: number, height: number) => void;
  sectionColumns: { [sectionId: string]: any[] };
  onColumnsChange: (sectionId: string, columns: any[]) => void;
  items: CMSItem[];
  activeId?: string | null;
  openStates?: Record<string, boolean>;
  onOpenChange?: (id: string, open: boolean) => void;
  rowLayoutType?: string | null;
  columnWidth?: string | undefined;
  renderVersion?: number;
}

const RowColumnDropZone: React.FC<RowColumnDropZoneProps> = ({
  rowId,
  columnIndex,
  isEditMode,
  slotSection,
  selectedElement,
  onSelectSection,
  onElementResize,
  sectionColumns,
  onColumnsChange,
  items,
  activeId,
  openStates,
  onOpenChange,
  rowLayoutType,
  columnWidth,
  renderVersion,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `${rowId}-col-${columnIndex}`,
    data: { type: 'row-column', rowId, columnIndex },
    disabled: !isEditMode,
  });

  const columnsForSection = React.useMemo(() => {
    if (!slotSection) return [] as any[];
    return sectionColumns[slotSection.id] || [{
      id: `${slotSection.id}-col-0`,
      items: items.filter(item => item.section_id === slotSection.id),
      width: 100,
    }];
  }, [slotSection, sectionColumns, items]);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[120px] transition-all duration-200',
        isEditMode && 'border border-dashed border-border/30 rounded p-2',
        isEditMode && isOver && 'bg-primary/10 ring-2 ring-primary',
        // Only hide border when slot has content AND we're not hovering
        isEditMode && slotSection && !isOver && 'border-transparent'
      )}
      style={{ width: rowLayoutType === 'custom' ? columnWidth : undefined }}
    >
      {slotSection ? (
        <div
          onClick={(e) => {
            if (activeId) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            onSelectSection?.(slotSection.id);
          }}
        >
          {isEditMode ? (
            <ResizableElement
              isSelected={selectedElement === slotSection.id}
              isEditMode={isEditMode}
              onResize={(width, height) => onElementResize(slotSection.id, width, height)}
            >
              <DraggableSection id={slotSection.id} isEditMode={isEditMode} className="h-full">
                <CollapsibleSection
                  title={slotSection.title}
                  description={slotSection.description}
                  sectionStyle={{
                    background_color: slotSection.background_color,
                    text_color: slotSection.text_color,
                    font_size: slotSection.font_size,
                    alignment: slotSection.alignment,
                    padding: slotSection.padding,
                    margin: slotSection.margin,
                    border_radius: slotSection.border_radius,
                    style_class: slotSection.style_class,
                    background_gradient: slotSection.background_gradient,
                    border_width: slotSection.border_width,
                    border_color: slotSection.border_color,
                    border_style: slotSection.border_style,
                    box_shadow: slotSection.box_shadow,
                    opacity: slotSection.opacity,
                    width_type: slotSection.width_type,
                    custom_width: slotSection.custom_width,
                    height_type: slotSection.height_type,
                    custom_height: slotSection.custom_height,
                    max_width: slotSection.max_width,
                    font_weight: slotSection.font_weight,
                    line_height: slotSection.line_height,
                    letter_spacing: slotSection.letter_spacing,
                    text_transform: slotSection.text_transform,
                    display_type: slotSection.display_type,
                    justify_content: slotSection.justify_content,
                    align_items: slotSection.align_items,
                    gap: slotSection.gap,
                    section_margin_top: slotSection.section_margin_top,
                    section_margin_bottom: slotSection.section_margin_bottom,
                    background_image: slotSection.background_image,
                    background_image_opacity: slotSection.background_image_opacity,
                    background_image_position: slotSection.background_image_position,
                    background_image_size: slotSection.background_image_size,
                    icon_name: slotSection.icon_name,
                    icon_position: slotSection.icon_position,
                    icon_size: slotSection.icon_size,
                    icon_color: slotSection.icon_color,
                    show_icon: slotSection.show_icon,
                    min_height: slotSection.min_height,
                    hover_opacity: slotSection.hover_opacity,
                    hover_scale: slotSection.hover_scale,
                    hover_transition_duration: slotSection.hover_transition_duration,
                    hover_background_color: slotSection.hover_background_color,
                    hover_background_gradient: slotSection.hover_background_gradient,
                    hover_text_color: slotSection.hover_text_color,
                    hover_border_color: slotSection.hover_border_color,
                    hover_box_shadow: slotSection.hover_box_shadow,
                    content_direction: slotSection.content_direction,
                    content_wrap: slotSection.content_wrap,
                    overflow_behavior: slotSection.overflow_behavior,
                  }}
                  nestedItems={[]}
                  defaultOpen={slotSection.default_expanded || false}
                  disableToggle={!!activeId}
                  isOpen={!!openStates?.[slotSection.id]}
                  onOpenChange={(o) => onOpenChange?.(slotSection.id, o)}
                >
                  <ColumnLayout
                    sectionId={slotSection.id}
                    columns={columnsForSection}
                    isEditMode={isEditMode}
                    onColumnsChange={(newColumns) => onColumnsChange(slotSection.id, newColumns)}
                    onItemClick={() => {}}
                    onSelectItem={(itemId) => onSelectSection?.(itemId)}
                    activeId={activeId}
                    renderVersion={renderVersion}
                  />
                </CollapsibleSection>
              </DraggableSection>
            </ResizableElement>
          ) : (
            <CollapsibleSection
              title={slotSection.title}
              description={slotSection.description}
              sectionStyle={{
                background_color: slotSection.background_color,
                text_color: slotSection.text_color,
                font_size: slotSection.font_size,
                alignment: slotSection.alignment,
                padding: slotSection.padding,
                margin: slotSection.margin,
                border_radius: slotSection.border_radius,
                style_class: slotSection.style_class,
                background_gradient: slotSection.background_gradient,
                border_width: slotSection.border_width,
                border_color: slotSection.border_color,
                border_style: slotSection.border_style,
                box_shadow: slotSection.box_shadow,
                opacity: slotSection.opacity,
                width_type: slotSection.width_type,
                custom_width: slotSection.custom_width,
                height_type: slotSection.height_type,
                custom_height: slotSection.custom_height,
                max_width: slotSection.max_width,
                font_weight: slotSection.font_weight,
                line_height: slotSection.line_height,
                letter_spacing: slotSection.letter_spacing,
                text_transform: slotSection.text_transform,
                display_type: slotSection.display_type,
                justify_content: slotSection.justify_content,
                align_items: slotSection.align_items,
                gap: slotSection.gap,
                section_margin_top: slotSection.section_margin_top,
                section_margin_bottom: slotSection.section_margin_bottom,
                background_image: slotSection.background_image,
                background_image_opacity: slotSection.background_image_opacity,
                background_image_position: slotSection.background_image_position,
                background_image_size: slotSection.background_image_size,
                icon_name: slotSection.icon_name,
                icon_position: slotSection.icon_position,
                icon_size: slotSection.icon_size,
                icon_color: slotSection.icon_color,
                show_icon: slotSection.show_icon,
                min_height: slotSection.min_height,
                hover_opacity: slotSection.hover_opacity,
                hover_scale: slotSection.hover_scale,
                hover_transition_duration: slotSection.hover_transition_duration,
                hover_background_color: slotSection.hover_background_color,
                hover_background_gradient: slotSection.hover_background_gradient,
                hover_text_color: slotSection.hover_text_color,
                hover_border_color: slotSection.hover_border_color,
                hover_box_shadow: slotSection.hover_box_shadow,
                content_direction: slotSection.content_direction,
                content_wrap: slotSection.content_wrap,
                overflow_behavior: slotSection.overflow_behavior,
              }}
              nestedItems={[]}
              defaultOpen={slotSection.default_expanded || false}
              disableToggle={!!activeId}
              isOpen={!!openStates?.[slotSection.id]}
              onOpenChange={(o) => onOpenChange?.(slotSection.id, o)}
            >
              <ColumnLayout
                sectionId={slotSection.id}
                columns={columnsForSection}
                isEditMode={isEditMode}
                onColumnsChange={(newColumns) => onColumnsChange(slotSection.id, newColumns)}
                onItemClick={() => {}}
                onSelectItem={(itemId) => onSelectSection?.(itemId)}
                activeId={activeId}
                renderVersion={renderVersion}
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
  renderVersion?: number;
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
  renderVersion,
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

  const childSectionIds = React.useMemo(() => childSections.map(s => s.id), [childSections]);
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
                     defaultOpen={slotSections[columnIndex]!.default_expanded || false}
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
                      renderVersion={renderVersion}
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
                defaultOpen={slotSections[columnIndex]!.default_expanded || false}
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
                  renderVersion={renderVersion}
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
        <SortableContext items={childSectionIds} strategy={columnCount > 1 ? horizontalListSortingStrategy : verticalListSortingStrategy}>
          {Array.from({ length: columnCount }, (_, index) => (
            <RowColumnDropZone
              key={`${row.id}-col-${index}`}
              rowId={row.id}
              columnIndex={index}
              isEditMode={isEditMode}
              slotSection={slotSections[index]}
              selectedElement={selectedElement}
              onSelectSection={onSelectSection}
              onElementResize={onElementResize}
              sectionColumns={sectionColumns}
              onColumnsChange={onColumnsChange}
              items={items}
              activeId={activeId}
              openStates={openStates}
              onOpenChange={onOpenChange}
              rowLayoutType={row.row_layout_type}
              columnWidth={getColumnWidth(index)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};