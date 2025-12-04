import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, X, Columns, Columns2, Columns3, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CMSSection, CMSItem } from '@/types/cms';
import { DraggableSection } from './DraggableSection';
import { DraggableItem } from './DraggableItem';
import { ResizableElement } from './ResizableElement';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { ColumnLayout } from './ColumnLayout';
import { CMSContent } from '@/components/CMSContent';
import { ItemControls } from './ItemControls';
import { SectionControls } from './SectionControls';
import { LearnMoreItem } from '@/components/homepage/LearnMoreItem';
import { InfoTextItem } from '@/components/homepage/InfoTextItem';

// Extracted to avoid re-mount loops of inline components causing DnD measuring cascades
interface RowColumnDropZoneProps {
  rowId: string;
  columnIndex: number;
  isEditMode: boolean;
  slotSection?: CMSSection;
  columnItems: CMSItem[]; // ✅ Elementy przypisane bezpośrednio do kolumny row
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
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onMoveItemUp?: (itemId: string) => void;
  onMoveItemDown?: (itemId: string) => void;
  rowDisplayType?: string | null;
  onUpdateSection?: (sectionId: string, updates: Partial<CMSSection>) => void;
  // Section editing props
  onEditSection?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeactivateSection?: (sectionId: string) => void;
}

const RowColumnDropZone: React.FC<RowColumnDropZoneProps> = ({
  rowId,
  columnIndex,
  isEditMode,
  slotSection,
  columnItems,
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
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onMoveItemUp,
  onMoveItemDown,
  rowDisplayType,
  onUpdateSection,
  onEditSection,
  onDuplicateSection,
  onDeactivateSection,
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
        'min-h-[200px] transition-all duration-200',
        isEditMode && 'border-2 border-dashed border-border/50 rounded-lg p-4',
        isEditMode && isOver && 'bg-orange-100 ring-2 ring-orange-500 border-orange-500',
        isEditMode && (slotSection || columnItems.length > 0) && !isOver && 'border-border/30',
        (rowLayoutType === 'custom' || (slotSection && slotSection.width_type === 'custom')) && 'shrink-0'
      )}
      style={{ width: (rowLayoutType === 'custom' || (slotSection && slotSection.width_type === 'custom')) ? columnWidth : undefined }}
    >
      {/* ✅ Najpierw renderuj elementy bezpośrednio w kolumnie row - TERAZ DRAGGABLE */}
      {columnItems.length > 0 && (
        <div className="space-y-2 mb-4">
          {columnItems.map((item, itemIdx) => {
            // Special rendering based on item type and row display_type
            let itemContent;
            if (item.type === 'info_text' && rowDisplayType === 'grid') {
              itemContent = <InfoTextItem item={item} />;
            } else if (item.type === 'multi_cell') {
              itemContent = (
                <LearnMoreItem 
                  item={item} 
                  itemIndex={itemIdx}
                  isExpanded={false}
                  onToggle={() => {}}
                />
              );
            } else {
              itemContent = <CMSContent item={item} onClick={() => {}} isEditMode={isEditMode} />;
            }
            
            return (
              <DraggableItem
                key={item.id}
                id={item.id as string}
                isEditMode={isEditMode}
              >
                <div 
                  className="relative group/item"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!activeId && onSelectSection) {
                      onSelectSection(item.id as string);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onEditItem?.(item.id as string);
                  }}
                >
                  {isEditMode && onDeleteItem && (
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
          })}
        </div>
      )}
      
      {/* Następnie renderuj child section jeśli istnieje */}
      {slotSection ? (
        <div
          className="relative group/section"
          onClick={(e) => {
            if (activeId) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            onSelectSection?.(slotSection.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEditSection?.(slotSection.id);
          }}
        >
          {/* Section Controls */}
          {isEditMode && (
            <SectionControls
              onEdit={() => onEditSection?.(slotSection.id)}
              onDuplicate={() => onDuplicateSection?.(slotSection.id)}
              onDeactivate={() => onDeactivateSection?.(slotSection.id)}
            />
          )}
          {isEditMode ? (
            <ResizableElement
              isSelected={selectedElement === slotSection.id}
              isEditMode={isEditMode}
              onResize={(width, height) => onElementResize(slotSection.id, width, height)}
              initialWidth={slotSection.width_type === 'custom' ? slotSection.custom_width || undefined : undefined}
              initialHeight={slotSection.height_type === 'custom' ? slotSection.custom_height || undefined : undefined}
            >
              <DraggableSection id={slotSection.id} isEditMode={isEditMode} className="h-full">
                <CollapsibleSection
                  title={slotSection.title}
                  description={slotSection.description}
                  isEditMode={isEditMode}
                  onTitleChange={(newTitle) => {
                    onUpdateSection?.(slotSection.id, { title: newTitle });
                  }}
                  onDescriptionChange={(newDescription) => {
                    onUpdateSection?.(slotSection.id, { description: newDescription });
                  }}
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
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                    onDuplicateItem={onDuplicateItem}
                    onMoveItemUp={onMoveItemUp}
                    onMoveItemDown={onMoveItemDown}
                    displayType={slotSection.display_type}
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
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onDuplicateItem={onDuplicateItem}
                  onMoveItemUp={onMoveItemUp}
                  onMoveItemDown={onMoveItemDown}
                  displayType={slotSection.display_type}
                />
            </CollapsibleSection>
          )}
        </div>
      ) : (
        // ✅ Brak child section - pokaż placeholder tylko jeśli też nie ma elementów
        columnItems.length === 0 && isEditMode && (
          <div className="flex items-center justify-center h-full text-muted-foreground/60">
            <div className="text-center">
              <Plus className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Przeciągnij element tutaj</p>
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
  onUpdateSection: (sectionId: string, updates: Partial<CMSSection>) => void;
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
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onMoveItemUp?: (itemId: string) => void;
  onMoveItemDown?: (itemId: string) => void;
  // Section editing props
  onEditSection?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeactivateSection?: (sectionId: string) => void;
}

export const RowContainer: React.FC<RowContainerProps> = ({
  row,
  sections,
  isEditMode,
  onUpdateRow,
  onUpdateSection,
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
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onMoveItemUp,
  onMoveItemDown,
  onEditSection,
  onDuplicateSection,
  onDeactivateSection,
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

  // ✅ Pobierz elementy przypisane BEZPOŚREDNIO do wiersza
  const rowItems = items.filter(it => it.section_id === row.id);
  
  // Grupuj elementy według column_index
  const itemsByColumn: CMSItem[][] = Array.from({ length: columnCount }, () => []);
  rowItems.forEach(item => {
    const colIdx = (item as any).column_index || 0;
    if (colIdx < columnCount) {
      itemsByColumn[colIdx].push(item);
    }
  });

  // Debug: log sections count
  console.log(`[RowContainer] Row ${row.id}:`, {
    columnCount,
    childSections: rawChildSections.length,
    directItems: rowItems.length,
    itemsByColumn: itemsByColumn.map((col, i) => ({ col: i, items: col.length }))
  });

  // Sort children by position and assign to columns sequentially (not by position index!)
  const childSections = [...rawChildSections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const slotSections: (CMSSection | undefined)[] = Array.from({ length: columnCount }, () => undefined);
  
  // Assign each child to the next available column slot sequentially
  childSections.forEach((child, index) => {
    if (index < columnCount) {
      slotSections[index] = child;
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
 
  const isCustomRow = React.useMemo(() => {
    return row.row_layout_type === 'custom' || slotSections.some((sec) => !!sec && sec.width_type === 'custom' && (sec.custom_width ?? 0) > 0);
  }, [row.row_layout_type, slotSections]);
 
  const getColumnWidth = (index: number) => {
    const sec = slotSections[index];
    if (isCustomRow && sec?.width_type === 'custom' && sec?.custom_width) {
      return `${sec.custom_width}px`;
    }
    return 'auto';
  };

  // ✅ Zawsze używaj ID kolumn, nie tylko child sections
  const columnIds = React.useMemo(() => 
    Array.from({ length: columnCount }, (_, i) => `${row.id}-col-${i}`)
  , [row.id, columnCount]);

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

      {/* Row Title - Display in both edit and view mode */}
      {row.title && (
        <div 
          className={cn(
            "max-w-6xl mx-auto mb-6 px-4",
            isEditMode && "cursor-pointer hover:ring-2 hover:ring-blue-300 hover:ring-offset-2 rounded-lg transition-all"
          )}
          onClick={(e) => {
            if (isEditMode) {
              e.stopPropagation();
              onSelectSection?.(row.id);
            }
          }}
        >
          <h2 
            className="text-3xl font-bold mb-4"
            style={{ 
              color: row.text_color || 'inherit',
              textAlign: row.alignment as any || 'left'
            }}
            dangerouslySetInnerHTML={{ __html: row.title }}
          />
          {row.description && (
            <div 
              className="text-lg"
              style={{ 
                color: row.text_color || 'inherit',
                textAlign: row.alignment as any || 'left'
              }}
              dangerouslySetInnerHTML={{ __html: row.description }}
            />
          )}
        </div>
      )}

      {/* Layout for sections: grid by default, flex when custom widths */}
      <div
        className={cn(
          isCustomRow
            ? 'flex flex-row flex-wrap gap-4'
            : cn('grid gap-4', getGridClass())
        )}
      >
        <SortableContext items={columnIds} strategy={columnCount > 1 ? horizontalListSortingStrategy : verticalListSortingStrategy}>
          {Array.from({ length: columnCount }, (_, index) => {
            const columnItems = itemsByColumn[index] || [];
            
            return (
              <RowColumnDropZone
                key={`${row.id}-col-${index}`}
                rowId={row.id}
                columnIndex={index}
                isEditMode={isEditMode}
                slotSection={slotSections[index]}
                columnItems={columnItems}
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
                renderVersion={renderVersion}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                onDuplicateItem={onDuplicateItem}
                onMoveItemUp={onMoveItemUp}
                onMoveItemDown={onMoveItemDown}
                rowDisplayType={row.display_type}
                onUpdateSection={onUpdateSection}
                onEditSection={onEditSection}
                onDuplicateSection={onDuplicateSection}
                onDeactivateSection={onDeactivateSection}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
};