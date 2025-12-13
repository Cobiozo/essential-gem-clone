import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableItem } from './DraggableItem';
import { ColumnLayout } from './ColumnLayout';
import { ItemControls } from './ItemControls';
import { SectionControls } from './SectionControls';
import { CMSContent } from '@/components/CMSContent';
import { LearnMoreItem } from '@/components/homepage/LearnMoreItem';
import { InfoTextItem } from '@/components/homepage/InfoTextItem';
import { CMSSection, CMSItem } from '@/types/cms';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
}

interface VisibilitySettings {
  visible_to_everyone?: boolean;
  visible_to_clients?: boolean;
  visible_to_partners?: boolean;
  visible_to_specjalista?: boolean;
  visible_to_anonymous?: boolean;
}

interface SectionRendererProps {
  section: CMSSection;
  sectionItems: CMSItem[];
  sectionColumnCount: number;
  itemsByColumn: CMSItem[][];
  editMode: boolean;
  selectedElement: string | null;
  activeId: string | null;
  expandedItemId: string | null;
  onSelectElement: (id: string) => void;
  onToggleExpand: (id: string | null) => void;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onMoveItemUp?: (itemId: string) => void;
  onMoveItemDown?: (itemId: string) => void;
  onEditSection?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeactivateSection?: (sectionId: string) => void;
  onItemVisibilityChange?: (itemId: string, visibility: VisibilitySettings) => void;
  onSectionVisibilityChange?: (sectionId: string, visibility: VisibilitySettings) => void;
}

// Helper function to apply all section styles
const applySectionStyles = (section: CMSSection): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  
  // Background color or gradient
  if (section.background_gradient) {
    styles.background = section.background_gradient;
  } else if (section.background_color) {
    styles.backgroundColor = section.background_color;
  }
  
  // Text color
  if (section.text_color) {
    styles.color = section.text_color;
  }
  
  // Padding
  if (section.padding !== undefined && section.padding !== null) {
    styles.padding = `${section.padding}px`;
  }
  
  // Margins
  if (section.section_margin_top !== undefined && section.section_margin_top !== null) {
    styles.marginTop = `${section.section_margin_top}px`;
  }
  if (section.section_margin_bottom !== undefined && section.section_margin_bottom !== null) {
    styles.marginBottom = `${section.section_margin_bottom}px`;
  }
  
  // Border
  if (section.border_radius !== undefined && section.border_radius !== null) {
    styles.borderRadius = `${section.border_radius}px`;
  }
  if (section.border_width && section.border_width > 0) {
    styles.borderWidth = `${section.border_width}px`;
    styles.borderStyle = section.border_style || 'solid';
    styles.borderColor = section.border_color || 'hsl(var(--border))';
  }
  
  // Box shadow
  if (section.box_shadow && section.box_shadow !== 'none') {
    styles.boxShadow = section.box_shadow;
  }
  
  // Opacity
  if (section.opacity !== undefined && section.opacity !== null && section.opacity !== 100) {
    styles.opacity = section.opacity / 100;
  }
  
  // Size
  if (section.width_type === 'custom' && section.custom_width) {
    styles.maxWidth = `${section.custom_width}px`;
    styles.marginLeft = 'auto';
    styles.marginRight = 'auto';
  } else if (section.max_width) {
    styles.maxWidth = `${section.max_width}px`;
  }
  
  if (section.min_height) {
    styles.minHeight = `${section.min_height}px`;
  }
  
  if (section.height_type === 'custom' && section.custom_height) {
    styles.height = `${section.custom_height}px`;
  }
  
  // Typography
  if (section.font_size) {
    styles.fontSize = `${section.font_size}px`;
  }
  if (section.font_weight) {
    styles.fontWeight = section.font_weight;
  }
  if (section.line_height) {
    styles.lineHeight = section.line_height;
  }
  if (section.letter_spacing) {
    styles.letterSpacing = `${section.letter_spacing}px`;
  }
  if (section.text_transform) {
    styles.textTransform = section.text_transform as React.CSSProperties['textTransform'];
  }
  
  // Layout (flexbox/grid)
  if (section.display_type === 'flex') {
    styles.display = 'flex';
    if (section.justify_content) {
      styles.justifyContent = section.justify_content;
    }
    if (section.align_items) {
      styles.alignItems = section.align_items;
    }
    if (section.content_direction) {
      styles.flexDirection = section.content_direction as React.CSSProperties['flexDirection'];
    }
    if (section.content_wrap) {
      styles.flexWrap = section.content_wrap as React.CSSProperties['flexWrap'];
    }
  }
  
  if (section.gap !== undefined && section.gap !== null) {
    styles.gap = `${section.gap}px`;
  }
  
  // Overflow
  if (section.overflow_behavior && section.overflow_behavior !== 'visible') {
    styles.overflow = section.overflow_behavior as React.CSSProperties['overflow'];
  }
  
  // Background image
  if (section.background_image) {
    styles.backgroundImage = `url(${section.background_image})`;
    styles.backgroundPosition = section.background_image_position || 'center';
    styles.backgroundSize = section.background_image_size || 'cover';
    styles.backgroundRepeat = 'no-repeat';
  }
  
  // Hover transition
  if (section.hover_transition_duration) {
    styles.transition = `all ${section.hover_transition_duration}ms ease-in-out`;
  }
  
  return styles;
};

// Get CSS variables for hover effects
const getSectionHoverVars = (section: CMSSection): Record<string, string | undefined> => {
  const vars: Record<string, string | undefined> = {};
  
  if (section.hover_background_color) vars['--hover-bg'] = section.hover_background_color;
  if (section.hover_background_gradient) vars['--hover-bg-gradient'] = section.hover_background_gradient;
  if (section.hover_text_color) vars['--hover-text'] = section.hover_text_color;
  if (section.hover_border_color) vars['--hover-border'] = section.hover_border_color;
  if (section.hover_box_shadow) vars['--hover-shadow'] = section.hover_box_shadow;
  if (section.hover_opacity !== undefined && section.hover_opacity !== null && section.hover_opacity !== 100) {
    vars['--hover-opacity'] = String(section.hover_opacity / 100);
  }
  if (section.hover_scale !== undefined && section.hover_scale !== null && section.hover_scale !== 1) {
    vars['--hover-scale'] = String(section.hover_scale);
  }
  if (section.hover_transition_duration) {
    vars['--hover-duration'] = `${section.hover_transition_duration}ms`;
  }
  
  return vars;
};

// Pre-defined sub-components (needed by CollapsibleSectionRenderer)
interface ItemRendererProps {
  item: CMSItem;
  itemIdx: number;
  sectionItems: CMSItem[];
  section: CMSSection;
  editMode: boolean;
  expandedItemId: string | null;
  onSelectElement: (id: string) => void;
  onToggleExpand: (id: string | null) => void;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
}

const ItemRenderer: React.FC<ItemRendererProps> = ({
  item,
  itemIdx,
  sectionItems,
  section,
  editMode,
  expandedItemId,
  onSelectElement,
  onToggleExpand,
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
}) => {
  let itemContent;
  
  if (item.type === 'info_text' && section.display_type === 'grid') {
    itemContent = <InfoTextItem item={item} />;
  } else if (item.type === 'multi_cell') {
    const itemIndex = sectionItems.findIndex(i => i.id === item.id);
    itemContent = (
      <LearnMoreItem 
        item={item} 
        itemIndex={itemIndex}
        isExpanded={expandedItemId === item.id}
        onToggle={() => onToggleExpand(expandedItemId === item.id ? null : item.id)}
      />
    );
  } else {
    itemContent = <CMSContent item={item} onClick={() => {}} isEditMode={editMode} />;
  }
  
  if (editMode && item.id) {
    return (
      <DraggableItem key={item.id} id={item.id as string} isEditMode={editMode}>
        <div 
          className="relative group/item"
          onClick={(e) => {
            e.stopPropagation();
            onSelectElement(item.id as string);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEditItem?.(item.id as string);
          }}
        >
          {onDeleteItem && (
            <ItemControls
              onEdit={() => onEditItem?.(item.id as string)}
              onDelete={() => onDeleteItem(item.id as string)}
              onDuplicate={onDuplicateItem ? () => onDuplicateItem(item.id as string) : undefined}
            />
          )}
          {item.type === 'multi_cell' ? itemContent : (
            <div>{itemContent}</div>
          )}
        </div>
      </DraggableItem>
    );
  }
  
  return <div key={item.id}>{itemContent}</div>;
};

const EmptySectionPlaceholder: React.FC = () => (
  <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/50">
    <div className="flex flex-col items-center gap-3">
      <div className="text-4xl">📦</div>
      <p className="text-sm font-medium">Pusta sekcja</p>
      <p className="text-xs">Przeciągnij element tutaj</p>
    </div>
  </div>
);

export const SectionRenderer: React.FC<SectionRendererProps> = ({
  section,
  sectionItems,
  sectionColumnCount,
  itemsByColumn,
  editMode,
  selectedElement,
  activeId,
  expandedItemId,
  onSelectElement,
  onToggleExpand,
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onMoveItemUp,
  onMoveItemDown,
  onEditSection,
  onDuplicateSection,
  onDeactivateSection,
  onItemVisibilityChange,
  onSectionVisibilityChange,
}) => {
  const sectionVisibility: VisibilitySettings = {
    visible_to_everyone: section.visible_to_everyone,
    visible_to_clients: section.visible_to_clients,
    visible_to_partners: section.visible_to_partners,
    visible_to_specjalista: section.visible_to_specjalista,
    visible_to_anonymous: section.visible_to_anonymous,
  };
  const isSectionRestricted = !section.visible_to_everyone;
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: {
      type: 'section',
      sectionId: section.id,
    },
    disabled: !editMode,
  });
  
  // Moved hasOnlyMultiCell check below collapsible check
  
  // Apply section styles
  const sectionStyles = applySectionStyles(section);
  const hoverVars = getSectionHoverVars(section);
  
  // Merge styles with hover CSS variables
  const combinedStyles: React.CSSProperties = {
    ...sectionStyles,
    ...hoverVars as React.CSSProperties,
  };
  
  // Collapsible section rendering (accordion)
  if (section.display_type === 'collapsible') {
    return (
      <CollapsibleSectionRenderer
        section={section}
        sectionItems={sectionItems}
        sectionColumnCount={sectionColumnCount}
        itemsByColumn={itemsByColumn}
        editMode={editMode}
        selectedElement={selectedElement}
        activeId={activeId}
        expandedItemId={expandedItemId}
        onSelectElement={onSelectElement}
        onToggleExpand={onToggleExpand}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
        onDuplicateItem={onDuplicateItem}
        onMoveItemUp={onMoveItemUp}
        onMoveItemDown={onMoveItemDown}
        onEditSection={onEditSection}
        onDuplicateSection={onDuplicateSection}
        onDeactivateSection={onDeactivateSection}
        onItemVisibilityChange={onItemVisibilityChange}
        onSectionVisibilityChange={onSectionVisibilityChange}
        sectionStyles={sectionStyles}
        hoverVars={hoverVars}
        combinedStyles={combinedStyles}
        sectionVisibility={sectionVisibility}
        setNodeRef={setNodeRef}
        isOver={isOver}
      />
    );
  }
  
  // Multi-cell section rendering (Learn More type)
  const hasOnlyMultiCell = sectionItems.length > 0 && sectionItems.every(item => item.type === 'multi_cell');
  if (hasOnlyMultiCell) {
    return (
      <div 
        ref={setNodeRef}
        onClick={(e) => {
          if (activeId) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onSelectElement(section.id);
        }}
        onDoubleClick={(e) => {
          if (editMode) {
            e.stopPropagation();
            onEditSection?.(section.id);
          }
        }}
      className={cn(
        "block w-full cursor-pointer transition-all duration-200 bg-card relative group/section hover-section",
        selectedElement === section.id && "ring-2 ring-blue-400 ring-offset-2",
        isOver && editMode && "ring-2 ring-green-500 ring-offset-2",
        section.style_class
      )}
        style={combinedStyles}
      >
        {editMode && (
          <SectionControls
            onEdit={() => onEditSection?.(section.id)}
            onDuplicate={() => onDuplicateSection?.(section.id)}
            onDeactivate={() => onDeactivateSection?.(section.id)}
            visibilityValues={sectionVisibility}
            onVisibilityChange={onSectionVisibilityChange ? (v) => onSectionVisibilityChange(section.id, v) : undefined}
          />
        )}
        {isOver && editMode && (
          <DropZoneIndicator />
        )}
        
        <div className="max-w-6xl mx-auto px-4">
          <div className="space-y-4 py-6">
            {section.title && section.show_title !== false && (
              <SectionTitle 
                section={section} 
                editMode={editMode} 
                onSelectElement={onSelectElement}
              />
            )}
            {section.description && (
              <SectionDescription 
                section={section} 
                editMode={editMode} 
                onSelectElement={onSelectElement} 
              />
            )}
            <div className="space-y-4">
              {sectionItems.map((item, itemIdx) => {
                const itemIndex = sectionItems.findIndex(i => i.id === item.id);
                const itemContent = (
                  <LearnMoreItem 
                    item={item} 
                    itemIndex={itemIndex}
                    isExpanded={expandedItemId === item.id}
                    onToggle={() => onToggleExpand(expandedItemId === item.id ? null : item.id)}
                  />
                );
                
                if (editMode && item.id) {
                  return (
                    <DraggableItem key={item.id} id={item.id as string} isEditMode={editMode}>
                      <div 
                        className="relative group/item"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectElement(item.id as string);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onEditItem?.(item.id as string);
                        }}
                      >
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
                }
                
                return <div key={item.id}>{itemContent}</div>;
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular section rendering
  return (
    <div 
      ref={setNodeRef}
      onClick={(e) => {
        if (activeId) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onSelectElement(section.id);
      }}
      onDoubleClick={(e) => {
        if (editMode) {
          e.stopPropagation();
          onEditSection?.(section.id);
        }
      }}
      className={cn(
        "block w-full cursor-pointer transition-all duration-200 bg-card relative group/section hover-section",
        selectedElement === section.id && "ring-2 ring-blue-400 ring-offset-2",
        isOver && editMode && "ring-2 ring-green-500 ring-offset-2",
        editMode && "min-h-[120px]",
        section.style_class
      )}
      style={combinedStyles}
    >
      {editMode && (
        <SectionControls
          onEdit={() => onEditSection?.(section.id)}
          onDuplicate={() => onDuplicateSection?.(section.id)}
          onDeactivate={() => onDeactivateSection?.(section.id)}
          visibilityValues={sectionVisibility}
          onVisibilityChange={onSectionVisibilityChange ? (v) => onSectionVisibilityChange(section.id, v) : undefined}
        />
      )}
      {isOver && editMode && (
        <DropZoneIndicator />
      )}
      
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          {section.show_title !== false && (
            <SectionTitle 
              section={section} 
              editMode={editMode} 
              onSelectElement={onSelectElement}
              variant="large"
            />
          )}
          {section.description && (
            <SectionDescription 
              section={section} 
              editMode={editMode} 
              onSelectElement={onSelectElement} 
            />
          )}
        </div>
        
        {sectionColumnCount > 0 ? (
          <ColumnLayout
            sectionId={section.id}
            columns={itemsByColumn.map((columnItems, colIdx) => ({
              id: `${section.id}-col-${colIdx}`,
              items: columnItems,
              width: 100 / sectionColumnCount,
            }))}
            isEditMode={editMode}
            onColumnsChange={() => {}}
            onItemClick={() => {}}
            onSelectItem={onSelectElement}
            activeId={activeId}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
            onDuplicateItem={onDuplicateItem}
            onMoveItemUp={onMoveItemUp}
            onMoveItemDown={onMoveItemDown}
          />
        ) : (
          <SortableContext
            items={sectionItems.filter(i => i.id).map(i => i.id as string)}
            strategy={verticalListSortingStrategy}
          >
            <div 
              className={section.display_type === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-12 mt-8' : 'space-y-4'}
              style={{ gap: section.gap ? `${section.gap}px` : undefined }}
            >
              {sectionItems.map((item, itemIdx) => (
                <ItemRenderer
                  key={item.id}
                  item={item}
                  itemIdx={itemIdx}
                  sectionItems={sectionItems}
                  section={section}
                  editMode={editMode}
                  expandedItemId={expandedItemId}
                  onSelectElement={onSelectElement}
                  onToggleExpand={onToggleExpand}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onDuplicateItem={onDuplicateItem}
                />
              ))}
              
              {editMode && sectionItems.length === 0 && (
                <EmptySectionPlaceholder />
              )}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
};

// Collapsible Section Renderer (Accordion type)
interface CollapsibleSectionRendererProps {
  section: CMSSection;
  sectionItems: CMSItem[];
  sectionColumnCount: number;
  itemsByColumn: CMSItem[][];
  editMode: boolean;
  selectedElement: string | null;
  activeId: string | null;
  expandedItemId: string | null;
  onSelectElement: (id: string) => void;
  onToggleExpand: (id: string | null) => void;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onMoveItemUp?: (itemId: string) => void;
  onMoveItemDown?: (itemId: string) => void;
  onEditSection?: (sectionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeactivateSection?: (sectionId: string) => void;
  onItemVisibilityChange?: (itemId: string, visibility: VisibilitySettings) => void;
  onSectionVisibilityChange?: (sectionId: string, visibility: VisibilitySettings) => void;
  sectionStyles: React.CSSProperties;
  hoverVars: Record<string, string | undefined>;
  combinedStyles: React.CSSProperties;
  sectionVisibility: VisibilitySettings;
  setNodeRef: (node: HTMLElement | null) => void;
  isOver: boolean;
}

const CollapsibleSectionRenderer: React.FC<CollapsibleSectionRendererProps> = ({
  section,
  sectionItems,
  sectionColumnCount,
  itemsByColumn,
  editMode,
  selectedElement,
  activeId,
  expandedItemId,
  onSelectElement,
  onToggleExpand,
  onEditItem,
  onDeleteItem,
  onDuplicateItem,
  onMoveItemUp,
  onMoveItemDown,
  onEditSection,
  onDuplicateSection,
  onDeactivateSection,
  onItemVisibilityChange,
  onSectionVisibilityChange,
  sectionStyles,
  hoverVars,
  combinedStyles,
  sectionVisibility,
  setNodeRef,
  isOver,
}) => {
  // Determine default value for accordion based on section.default_expanded
  const defaultValue = section.default_expanded ? section.id : undefined;
  
  return (
    <div 
      ref={setNodeRef}
      onClick={(e) => {
        if (activeId) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onSelectElement(section.id);
      }}
      onDoubleClick={(e) => {
        if (editMode) {
          e.stopPropagation();
          onEditSection?.(section.id);
        }
      }}
      className={cn(
        "block w-full cursor-pointer transition-all duration-200 bg-card relative group/section hover-section",
        selectedElement === section.id && "ring-2 ring-blue-400 ring-offset-2",
        isOver && editMode && "ring-2 ring-green-500 ring-offset-2",
        section.style_class
      )}
      style={combinedStyles}
    >
      {editMode && (
        <SectionControls
          onEdit={() => onEditSection?.(section.id)}
          onDuplicate={() => onDuplicateSection?.(section.id)}
          onDeactivate={() => onDeactivateSection?.(section.id)}
          visibilityValues={sectionVisibility}
          onVisibilityChange={onSectionVisibilityChange ? (v) => onSectionVisibilityChange(section.id, v) : undefined}
        />
      )}
      {isOver && editMode && (
        <DropZoneIndicator />
      )}
      
      <div className="max-w-6xl mx-auto px-4">
        <Accordion 
          type="single" 
          collapsible 
          defaultValue={defaultValue}
          className="w-full"
        >
          <AccordionItem value={section.id} className="border-none">
            <AccordionTrigger 
              className={cn(
                "py-6 hover:no-underline",
                section.text_color && `text-[${section.text_color}]`
              )}
              style={{
                color: section.text_color || undefined,
                fontSize: section.font_size ? `${section.font_size}px` : '1.5rem',
                fontWeight: section.font_weight || 600,
              }}
            >
              <div className="flex flex-col items-start gap-2">
                {/* Collapsible header - custom header text or fallback to title */}
                {(section as any).collapsible_header ? (
                  <span dangerouslySetInnerHTML={{ __html: (section as any).collapsible_header }} />
                ) : section.title ? (
                  <span dangerouslySetInnerHTML={{ __html: section.title }} />
                ) : (
                  <span className="text-muted-foreground">Kliknij aby rozwinąć</span>
                )}
                {/* Show description in trigger if collapsible_header is set */}
                {(section as any).collapsible_header && section.description && (
                  <span 
                    className="text-sm font-normal text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: section.description }}
                  />
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              {/* Show description in content only if collapsible_header is NOT set */}
              {!(section as any).collapsible_header && section.description && (
                <p 
                  className="text-muted-foreground mb-6"
                  dangerouslySetInnerHTML={{ __html: section.description }}
                />
              )}
              {/* Show title in content if collapsible_header is set */}
              {(section as any).collapsible_header && section.title && section.show_title !== false && (
                <h3 
                  className="text-2xl font-bold mb-4"
                  style={{ color: section.text_color || undefined }}
                  dangerouslySetInnerHTML={{ __html: section.title }}
                />
              )}
              
              {sectionColumnCount > 0 ? (
                <ColumnLayout
                  sectionId={section.id}
                  columns={itemsByColumn.map((columnItems, colIdx) => ({
                    id: `${section.id}-col-${colIdx}`,
                    items: columnItems,
                    width: 100 / sectionColumnCount,
                  }))}
                  isEditMode={editMode}
                  onColumnsChange={() => {}}
                  onItemClick={() => {}}
                  onSelectItem={onSelectElement}
                  activeId={activeId}
                  onEditItem={onEditItem}
                  onDeleteItem={onDeleteItem}
                  onDuplicateItem={onDuplicateItem}
                  onMoveItemUp={onMoveItemUp}
                  onMoveItemDown={onMoveItemDown}
                />
              ) : (
                <SortableContext
                  items={sectionItems.filter(i => i.id).map(i => i.id as string)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {sectionItems.map((item, itemIdx) => (
                      <ItemRenderer
                        key={item.id}
                        item={item}
                        itemIdx={itemIdx}
                        sectionItems={sectionItems}
                        section={section}
                        editMode={editMode}
                        expandedItemId={expandedItemId}
                        onSelectElement={onSelectElement}
                        onToggleExpand={onToggleExpand}
                        onEditItem={onEditItem}
                        onDeleteItem={onDeleteItem}
                        onDuplicateItem={onDuplicateItem}
                      />
                    ))}
                    
                    {editMode && sectionItems.length === 0 && (
                      <EmptySectionPlaceholder />
                    )}
                  </div>
                </SortableContext>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

// Sub-components
const DropZoneIndicator: React.FC = () => (
  <div className="absolute inset-0 bg-green-500/10 pointer-events-none rounded-lg border-2 border-green-500 border-dashed flex items-center justify-center z-10">
    <span className="text-green-700 font-semibold bg-card/90 px-4 py-2 rounded-lg shadow-lg">
      ⬇ Upuść element tutaj
    </span>
  </div>
);

interface SectionTitleProps {
  section: CMSSection;
  editMode: boolean;
  onSelectElement: (id: string) => void;
  variant?: 'default' | 'large';
}

const SectionTitle: React.FC<SectionTitleProps> = ({ section, editMode, onSelectElement, variant = 'default' }) => (
  <h2 
    className={cn(
      variant === 'large' 
        ? "text-4xl font-bold mb-6 text-foreground uppercase tracking-wide"
        : "text-3xl font-bold text-center mb-8",
      editMode && "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 rounded-lg px-4 py-2 transition-all"
    )}
    style={{ 
      color: section.text_color || 'inherit',
      fontSize: section.font_size ? `${section.font_size}px` : undefined,
      fontWeight: section.font_weight || undefined,
    }}
    dangerouslySetInnerHTML={{ __html: section.title || '' }}
    onClick={(e) => {
      if (editMode) {
        e.stopPropagation();
        onSelectElement(section.id);
      }
    }}
    title={editMode ? "Kliknij aby edytować" : undefined}
  />
);

interface SectionDescriptionProps {
  section: CMSSection;
  editMode: boolean;
  onSelectElement: (id: string) => void;
}

const SectionDescription: React.FC<SectionDescriptionProps> = ({ section, editMode, onSelectElement }) => (
  <p 
    className={cn(
      "text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto",
      editMode && "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 rounded-lg px-4 py-2 transition-all"
    )}
    dangerouslySetInnerHTML={{ __html: section.description || '' }}
    onClick={(e) => {
      if (editMode) {
        e.stopPropagation();
        onSelectElement(section.id);
      }
    }}
    title={editMode ? "Kliknij aby edytować" : undefined}
  />
);

export default SectionRenderer;
