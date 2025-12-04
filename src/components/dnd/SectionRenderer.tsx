import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DraggableItem } from './DraggableItem';
import { ColumnLayout } from './ColumnLayout';
import { ItemControls } from './ItemControls';
import { CMSContent } from '@/components/CMSContent';
import { LearnMoreItem } from '@/components/homepage/LearnMoreItem';
import { InfoTextItem } from '@/components/homepage/InfoTextItem';
import { CMSSection, CMSItem } from '@/types/cms';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
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
}

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
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: {
      type: 'section',
      sectionId: section.id,
    },
    disabled: !editMode,
  });
  
  const hasOnlyMultiCell = sectionItems.length > 0 && sectionItems.every(item => item.type === 'multi_cell');
  
  // Multi-cell section rendering (Learn More type)
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
        className={cn(
          "block w-full cursor-pointer transition-all duration-200 bg-card mb-6 relative",
          selectedElement === section.id && "ring-2 ring-blue-400 ring-offset-2",
          isOver && editMode && "ring-2 ring-green-500 ring-offset-2"
        )}
        style={{
          backgroundColor: section.background_color || '#ffffff',
          color: section.text_color || '#000000',
          padding: section.padding ? `${section.padding}px 16px` : '48px 16px',
        }}
      >
        {isOver && editMode && (
          <DropZoneIndicator />
        )}
        
        <div className="max-w-6xl mx-auto">
          <div className="space-y-4 py-6">
            {section.title && (
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
      className={cn(
        "block w-full cursor-pointer transition-all duration-200 bg-card mb-6 relative",
        selectedElement === section.id && "ring-2 ring-blue-400 ring-offset-2",
        isOver && editMode && "ring-2 ring-green-500 ring-offset-2",
        editMode && "min-h-[120px]"
      )}
      style={{
        backgroundColor: section.background_color || '#ffffff',
        color: section.text_color || '#000000',
        padding: section.padding ? `${section.padding}px 16px` : '48px 16px',
      }}
    >
      {isOver && editMode && (
        <DropZoneIndicator />
      )}
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <SectionTitle 
            section={section} 
            editMode={editMode} 
            onSelectElement={onSelectElement}
            variant="large"
          />
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
            <div className={section.display_type === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-12 mt-8' : 'space-y-4'}>
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
    style={{ color: section.text_color || 'inherit' }}
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

export default SectionRenderer;
