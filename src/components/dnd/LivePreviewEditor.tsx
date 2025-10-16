import React, { useState, useEffect, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, Loader2, Layout, Columns, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropProvider } from './DragDropProvider';
import { DraggableSection } from './DraggableSection';
import { convertSupabaseSections, convertSupabaseSection } from '@/lib/typeUtils';
import { SimpleRowDemo } from './SimpleRowDemo';
import { DraggableItem } from './DraggableItem';
import { ResizableElement } from './ResizableElement';
import { ColumnLayout } from './ColumnLayout';
import { EditingToolbar } from './EditingToolbar';
import { LayoutControls } from './LayoutControls';
import { DevicePreview, DeviceFrame, DeviceType } from './DevicePreview';
import { ResponsiveControls, defaultResponsiveSettings } from './ResponsiveControls';
import { InactiveElementsManager } from './InactiveElementsManager';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { CMSContent } from '@/components/CMSContent';
import { LearnMoreItem } from '@/components/homepage/LearnMoreItem';
import { InfoTextItem } from '@/components/homepage/InfoTextItem';
import { CMSSection, CMSItem } from '@/types/cms';
import { RowContainer } from './RowContainer';
import { ElementsPanel } from './ElementsPanel';
import { SidePanel } from './SidePanel';
import { ItemControls } from './ItemControls';
import { ItemEditor } from '@/components/cms/ItemEditor';
// import { DndDiagnostics } from './DndDiagnostics';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
}

// Component for rendering regular (non-row) sections with droppable zone
interface RegularSectionContentProps {
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
}

interface RegularSectionContentPropsExtended extends RegularSectionContentProps {
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onMoveItemUp?: (itemId: string) => void;
  onMoveItemDown?: (itemId: string) => void;
}

const RegularSectionContent: React.FC<RegularSectionContentPropsExtended> = ({
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
  // Make the section droppable so elements can be dropped into it
  const { setNodeRef, isOver } = useDroppable({
    id: section.id,
    data: {
      type: 'section',
      sectionId: section.id,
      columnIndex: 0, // Default to first column
    },
    disabled: !editMode,
  });

  console.log(`[RegularSectionContent] Rendering section ${section.id} (${section.title}) with ${sectionItems.length} items, columns: ${sectionColumnCount}`, 
    sectionItems.map(i => ({ id: i.id, type: i.type })));

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
        "block w-full cursor-pointer transition-all duration-200 bg-white mb-6 relative",
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
        <div className="absolute inset-0 bg-green-500/10 pointer-events-none rounded-lg border-2 border-green-500 border-dashed flex items-center justify-center">
          <span className="text-green-700 font-semibold bg-white/90 px-4 py-2 rounded-lg">
            Upuść tutaj
          </span>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 
            className="text-4xl font-bold mb-6 text-black uppercase tracking-wide"
            dangerouslySetInnerHTML={{ __html: section.title || '' }}
          />
          {section.description && (
            <p 
              className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed"
              dangerouslySetInnerHTML={{ __html: section.description }}
            />
          )}
        </div>
        
        {/* Section Items */}
        {sectionColumnCount > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${sectionColumnCount}, 1fr)`,
            gap: '48px',
            marginTop: '32px'
          }}>
            {itemsByColumn.map((columnItems, colIdx) => (
              <SortableContext
                key={colIdx}
                items={columnItems.filter(i => i.id).map(i => i.id as string)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {columnItems.map((item, itemIdx) => {
                    let itemContent;
                    
                    if (item.type === 'info_text' && section.display_type === 'grid') {
                      itemContent = <InfoTextItem item={item} />;
                    } else if (item.type === 'multi_cell') {
                      const itemIndex = columnItems.findIndex(i => i.id === item.id);
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
                            className="relative group"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectElement(item.id as string);
                            }}
                          >
                            {/* Item Controls - always visible in edit mode */}
                            {onEditItem && onDeleteItem && (
                              <ItemControls
                                onEdit={() => onEditItem(item.id as string)}
                                onDelete={() => onDeleteItem(item.id as string)}
                                onDuplicate={onDuplicateItem ? () => onDuplicateItem(item.id as string) : undefined}
                                onMoveUp={onMoveItemUp ? () => onMoveItemUp(item.id as string) : undefined}
                                onMoveDown={onMoveItemDown ? () => onMoveItemDown(item.id as string) : undefined}
                                canMoveUp={itemIdx > 0}
                                canMoveDown={itemIdx < columnItems.length - 1}
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
              </SortableContext>
            ))}
          </div>
        ) : (
          <SortableContext
            items={sectionItems.filter(i => i.id).map(i => i.id as string)}
            strategy={verticalListSortingStrategy}
          >
            <div className={section.display_type === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-12 mt-8' : 'space-y-4'}>
              {sectionItems.map((item, itemIdx) => {
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
                        className="relative group"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectElement(item.id as string);
                        }}
                      >
                        {onEditItem && onDeleteItem && (
                          <ItemControls
                            onEdit={() => onEditItem(item.id as string)}
                            onDelete={() => onDeleteItem(item.id as string)}
                            onDuplicate={onDuplicateItem ? () => onDuplicateItem(item.id as string) : undefined}
                            onMoveUp={onMoveItemUp ? () => onMoveItemUp(item.id as string) : undefined}
                            onMoveDown={onMoveItemDown ? () => onMoveItemDown(item.id as string) : undefined}
                            canMoveUp={itemIdx > 0}
                            canMoveDown={itemIdx < sectionItems.length - 1}
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
          </SortableContext>
        )}
      </div>
    </div>
  );
};

export const LivePreviewEditor: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [layoutMode, setLayoutMode] = useState<'single' | 'columns' | 'grid'>('single');
  const [columnCount, setColumnCount] = useState(2);
  const [currentDevice, setCurrentDevice] = useState<DeviceType>('desktop');
  const [responsiveSettings, setResponsiveSettings] = useState(defaultResponsiveSettings);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  // Column layout state
  const [sectionColumns, setSectionColumns] = useState<{ [sectionId: string]: Column[] }>({});
  // Controlled open states for sections (persist during re-renders)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [dragVersion, setDragVersion] = useState(0);
  const [inactiveRefresh, setInactiveRefresh] = useState(0);
  
  // History for undo/redo
  const [history, setHistory] = useState<{ sections: CMSSection[], items: CMSItem[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-save functionality
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>();
  const hasFixedNestedRowsRef = React.useRef(false);
  
  const saveToHistory = useCallback((newSections: CMSSection[], newItems: CMSItem[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ sections: newSections, items: newItems });
      return newHistory.slice(-20); // Keep last 20 changes
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  // Initialize columns for sections
  const initializeColumns = (sections: CMSSection[], items: CMSItem[]) => {
    const columnData: { [sectionId: string]: Column[] } = {};
    
    sections.forEach(section => {
      const sectionItems = items.filter(item => item.section_id === section.id);
      
      // Check if section has saved column count from style_class or derive from items
      const savedColumnCount = section.style_class?.match(/columns-(\d+)/)?.[1];
      const derivedFromItems = sectionItems.reduce((max, it: any) => {
        const ci = typeof it.column_index === 'number' ? it.column_index : 0;
        return Math.max(max, ci);
      }, 0) + 1;
      const columnCount = savedColumnCount ? parseInt(savedColumnCount, 10) : Math.max(1, derivedFromItems);
      
      // Prepare columns
      const columns: Column[] = Array.from({ length: Math.max(1, columnCount) }, (_, i) => ({
        id: `${section.id}-col-${i}`,
        items: [],
        width: 100 / Math.max(1, columnCount),
      }));
      
      // Distribute items by stored column_index
      sectionItems.forEach((it: any) => {
        const idx = Math.min(columns.length - 1, Math.max(0, typeof it.column_index === 'number' ? it.column_index : 0));
        columns[idx].items.push(it);
      });
      
      columnData[section.id] = columns;
    });
    
    setSectionColumns(columnData);
  };

  // Safety: bring any rows that accidentally got nested back to top-level
   const fixNestedRows = async (sectionsList: CMSSection[]) => {
     if (hasFixedNestedRowsRef.current) return;
     if (!isAdmin) return;
    const nested = sectionsList.filter(s => s.section_type === 'row' && s.parent_id);
    if (nested.length === 0) return;
    try {
      const ids = nested.map(s => s.id);
      const { error } = await supabase
        .from('cms_sections')
        .update({ parent_id: null, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      hasFixedNestedRowsRef.current = true;
      // Update local state without triggering a refetch loop
      setSections(prev => prev.map(s => ids.includes(s.id) ? { ...s, parent_id: null } : s));
      toast({ title: 'Naprawiono układ', description: 'Zagnieżdżone wiersze przeniesiono na poziom główny' });
    } catch (e) {
      console.error('fixNestedRows error', e);
    }
  };

  // Fix sections without page_id
  const hasFixedMissingPageIdRef = React.useRef(false);
  const fixMissingPageId = async () => {
    if (hasFixedMissingPageIdRef.current) return;
    if (!isAdmin) return;
    try {
      // Find sections without page_id
      const { data: orphanSections } = await supabase
        .from('cms_sections')
        .select('id, title')
        .is('page_id', null)
        .eq('is_active', true);
      
      if (!orphanSections || orphanSections.length === 0) return;
      
      console.log('[LivePreviewEditor] Found sections without page_id:', orphanSections);
      
      // Assign them to the homepage
      const { error } = await supabase
        .from('cms_sections')
        .update({ 
          page_id: '8f3009d3-3167-423f-8382-3eab1dce8cb1',
          updated_at: new Date().toISOString() 
        })
        .is('page_id', null)
        .eq('is_active', true);
      
      if (error) throw error;
      
      hasFixedMissingPageIdRef.current = true;
      toast({ 
        title: 'Naprawiono', 
        description: `Przypisano ${orphanSections.length} sekcji do strony głównej` 
      });
      
      // Refetch data to show the fixed sections
      await fetchData();
    } catch (e) {
      console.error('fixMissingPageId error', e);
    }
  };

  // Repair helper: if a section is active but shows 0 items while DB has items, reactivate them
  const hasRepairedInvisibleRef = React.useRef(false);
  const repairInvisibleItems = async (sectionsList: CMSSection[], itemsList: CMSItem[]) => {
    if (hasRepairedInvisibleRef.current) return false;
    try {
      // Sections with zero visible items
      const zeroItemSections = sectionsList.filter(sec => itemsList.filter(it => it.section_id === sec.id).length === 0);
      if (zeroItemSections.length === 0) return false;

      // Check DB for any items for these sections (admin policy allows seeing inactive)
      const idsToCheck = zeroItemSections.map(s => s.id);
      const { data: hiddenItems } = await supabase
        .from('cms_items')
        .select('id, section_id, is_active, page_id')
        .in('section_id', idsToCheck);

      if (!hiddenItems || hiddenItems.length === 0) return false;

      const sectionIdsNeedingActivation = Array.from(new Set(hiddenItems.map(it => it.section_id)));
      const { error } = await supabase
        .from('cms_items')
        .update({ is_active: true, page_id: null, updated_at: new Date().toISOString() })
        .in('section_id', sectionIdsNeedingActivation);

      if (error) throw error;
      hasRepairedInvisibleRef.current = true;
      console.log('Repaired invisible items for sections:', sectionIdsNeedingActivation);
      return true;
    } catch (e) {
      console.error('repairInvisibleItems error', e);
      return false;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all sections (including rows and their children)
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', '8f3009d3-3167-423f-8382-3eab1dce8cb1')
        .eq('is_active', true)
        .order('position');
      
      if (sectionsError) throw sectionsError;
      
      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('cms_items')
        .select('*')
        .eq('page_id', '8f3009d3-3167-423f-8382-3eab1dce8cb1')
        .eq('is_active', true)
        .order('position');
      
      if (itemsError) throw itemsError;
      
      // Convert database data to proper types
      const convertedSections = convertSupabaseSections(sectionsData || []);
      const convertedItems = (itemsData || []).map((item: any) => ({
        ...item,
        cells: item.cells ? (Array.isArray(item.cells) ? item.cells : JSON.parse(item.cells)) : []
      }));
      
      setSections(convertedSections);
      setItems(convertedItems);

      // Debug: log size fields for sections
      try {
        const sizeSnapshot = convertedSections.map(s => ({ id: s.id, title: s.title, width_type: s.width_type, custom_width: s.custom_width, height_type: s.height_type, custom_height: s.custom_height }));
        console.log('[DEBUG] Sections size snapshot:', sizeSnapshot);
      } catch (e) {
        // ignore
      }

      // Initialize open sections based on default_expanded values
      const initialOpenSections: Record<string, boolean> = {};
      convertedSections.forEach(section => {
        // Dla płaskich sekcji (nie-rows) domyślnie rozwijaj w edytorze
        initialOpenSections[section.id] = section.section_type === 'section' && !section.parent_id 
          ? true 
          : (section.default_expanded || false);
      });
      setOpenSections(initialOpenSections);

      // Debug: log sections count
      console.log('[LivePreviewEditor] Loaded sections:', {
        total: convertedSections.length,
        rows: convertedSections.filter(s => s.section_type === 'row').length,
        flatSections: convertedSections.filter(s => s.section_type === 'section' && !s.parent_id).length,
        childSections: convertedSections.filter(s => s.parent_id).length,
        items: convertedItems.length
      });

      // Debug counts for key sections
      try {
        const names = ['Witamy w Pure Life', 'DOWIEDZ SIĘ WIĘCEJ'];
        names.forEach((name) => {
          const sec = convertedSections.find(s => s.title?.trim().toLowerCase() === name.toLowerCase());
          if (sec) {
            const cnt = convertedItems.filter(it => it.section_id === sec.id).length;
            console.log(`[DEBUG] Section "${name}" items:`, cnt, { sectionId: sec.id });
          } else {
            console.log(`[DEBUG] Section not found by title: ${name}`);
          }
        });
      } catch (e) {
        console.warn('Debug logging failed', e);
      }
      
      // Initialize history
      if (convertedSections && convertedItems) {
        setHistory([{ sections: convertedSections, items: convertedItems }]);
        setHistoryIndex(0);
        initializeColumns(convertedSections, convertedItems);

        // Attempt auto-repair of invisible items once
        const repaired = await repairInvisibleItems(convertedSections, convertedItems);
        if (repaired) {
          console.log('Auto-repair completed, refetching data...');
          await fetchData();
          return;
        }
      }

      // Safety: ensure no rows are nested inside rows
      await fixNestedRows(convertedSections);
      
      // Fix sections without page_id
      await fixMissingPageId();

      // Load page layout settings (sections grid)
      const { data: settings } = await supabase
        .from('page_settings')
        .select('layout_mode, column_count')
        .eq('page_type', 'homepage')
        .maybeSingle();
      if (settings) {
        setLayoutMode((settings.layout_mode as any) || 'single');
        setColumnCount(settings.column_count || 1);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const autoSave = useCallback(async (newSections: CMSSection[], newItems: CMSItem[]) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        // Build payload for edge function - include size fields and row layout so latest widths persist
        const sectionsPayload = newSections.map((s) => ({ id: s.id, position: s.position, width_type: s.width_type, height_type: s.height_type, custom_width: s.custom_width ?? null, custom_height: s.custom_height ?? null, row_layout_type: (s as any).row_layout_type ?? null }));

        const itemsBySection: { [key: string]: CMSItem[] } = {};
        newItems.forEach((it) => {
          const sid = (it.section_id as string) || '';
          if (!sid) return; // skip invalid
          if (!itemsBySection[sid]) itemsBySection[sid] = [];
          itemsBySection[sid].push(it);
        });

        const itemsPayload: { id: string; section_id: string; position: number; column_index?: number }[] = [];
        Object.entries(itemsBySection).forEach(([sid, arr]) => {
          arr.forEach((it: any, idx) => {
            itemsPayload.push({ id: it.id as string, section_id: sid, position: idx, column_index: typeof it.column_index === 'number' ? it.column_index : 0 });
          });
        });

        const { data, error } = await supabase.functions.invoke('save-cms-layout', {
          body: { sections: sectionsPayload, items: itemsPayload },
        });
        if (error) throw error;
        if (!data?.ok) {
          console.error('Auto-save returned non-ok response:', data);
          throw new Error('Auto-save did not complete successfully');
        }

        setAutoSaveStatus('saved');
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
      }
    }, 2000);
  }, []);

  // Save page-level layout settings (sections grid)
  const savePageSettings = useCallback(async (mode: 'single' | 'columns' | 'grid', count: number) => {
    try {
      const { error } = await supabase
        .from('page_settings')
        .upsert(
          { page_type: 'homepage', layout_mode: mode, column_count: count, updated_at: new Date().toISOString() },
          { onConflict: 'page_type' }
        );
      if (error) throw error;

      // Broadcast so homepage refreshes
      const channel = supabase.channel('cms-live');
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({ type: 'broadcast', event: 'layout-updated', payload: { at: Date.now() } });
          supabase.removeChannel(channel);
        }
      });

      toast({ title: 'Zapisano', description: 'Ustawienia układu strony zapisane' });
    } catch (e) {
      console.error('savePageSettings error', e);
      toast({ title: 'Błąd', description: 'Nie udało się zapisać ustawień układu', variant: 'destructive' });
    }
  }, [toast]);
  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('🟢 [DragStart] TRIGGERED!', event);
    const draggedId = event.active.id as string;
    console.log('[DragStart] Element ID:', draggedId);
    console.log('[DragStart] Element data:', event.active.data.current);
    setActiveId(draggedId);
  }, []);

  const createDefaultContent = (elementType: string) => {
    console.log('[createDefaultContent] Creating content for type:', elementType);
    
    switch (elementType) {
      case 'heading':
        return [{ type: 'heading', content: 'Nowy nagłówek', level: 2 }];
      case 'text':
        return [{ type: 'text', content: 'Nowy tekst' }];
      case 'image':
        return [{ type: 'image', content: '', alt: 'Obrazek' }];
      case 'video':
        return [{ type: 'video', content: '', title: 'Film' }];
      case 'button':
        return [{ type: 'button', content: 'Kliknij', url: '#' }];
      case 'divider':
        return [{ type: 'divider' }];
      case 'spacer':
        return [{ type: 'spacer', height: 40 }];
      case 'maps':
        return [{ type: 'maps', content: '', title: 'Mapa' }];
      case 'icon':
        return [{ type: 'icon', content: 'Star' }];
      
      // Layout elements - nie powinny być używane tutaj, ale dla bezpieczeństwa
      case 'container':
        console.warn('[createDefaultContent] WARNING: container should create section, not item');
        return [{ type: 'container', content: 'BŁĄD: To powinno być sekcją' }];
      case 'grid':
        console.warn('[createDefaultContent] WARNING: grid should create section, not item');
        return [{ type: 'grid', content: 'BŁĄD: To powinno być sekcją' }];
      
      // Ogólne elementy
      case 'image-field':
        return [{ type: 'image-field', content: '', alt: 'Dodaj obrazek' }];
      case 'icon-field':
        return [{ type: 'icon-field', content: 'Star', color: 'currentColor' }];
      case 'carousel':
        return [{ type: 'carousel', images: [], autoplay: true, interval: 3000 }];
      case 'accessibility':
        return [{ type: 'accessibility', content: 'Informacje o dostępności' }];
      case 'gallery':
        return [{ type: 'gallery', images: [], columns: 3 }];
      case 'icon-list':
        return [{ type: 'icon-list', items: [{ icon: 'Check', text: 'Element listy' }] }];
      case 'counter':
        return [{ type: 'counter', start: 0, end: 100, duration: 2000, suffix: '', prefix: '' }];
      case 'progress-bar':
        return [{ type: 'progress-bar', value: 50, max: 100, label: 'Postęp', showValue: true }];
      case 'testimonial':
        return [{ type: 'testimonial', content: 'Treść referencji', author: 'Imię Nazwisko', role: 'Stanowisko', avatar: '' }];
      case 'cards':
        return [{ type: 'cards', items: [{ title: 'Karta', content: 'Treść karty' }] }];
      case 'accordion':
        return [{ type: 'accordion', items: [{ title: 'Pytanie', content: 'Odpowiedź' }] }];
      case 'toggle':
        return [{ type: 'toggle', title: 'Kliknij aby rozwinąć', content: 'Zawartość' }];
      case 'social-icons':
        return [{ type: 'social-icons', icons: [{ platform: 'Facebook', url: 'https://facebook.com' }], size: 24 }];
      case 'alert':
        return [{ type: 'alert', content: 'Wiadomość', variant: 'default', title: '' }];
      case 'soundcloud':
        return [{ type: 'soundcloud', url: '', height: 166 }];
      case 'shortcode':
        return [{ type: 'shortcode', content: '[shortcode]' }];
      case 'html':
        return [{ type: 'html', content: '<div>Twój kod HTML</div>' }];
      case 'menu-anchor':
        return [{ type: 'menu-anchor', id: 'anchor', label: 'Kotwica' }];
      case 'sidebar':
        return [{ type: 'sidebar', content: 'Zawartość panelu bocznego', position: 'right' }];
      case 'learn-more':
        return [{ type: 'learn-more', title: 'Dowiedz się więcej', content: 'Treść', url: '#' }];
      case 'rating':
        return [{ type: 'rating', value: 5, max: 5, label: 'Ocena' }];
      case 'trustindex':
        return [{ type: 'trustindex', widgetId: '', platform: 'google' }];
      case 'ppom':
        return [{ type: 'ppom', productId: '' }];
      case 'text-path':
        return [{ type: 'text-path', text: 'Tekst na ścieżce', path: 'M0,50 Q50,0 100,50' }];
      
      default:
        console.warn('[createDefaultContent] Unknown element type:', elementType);
        return [{ type: 'text', content: `Element typu: ${elementType}` }];
    }
  };

  const getElementTypeName = (elementType: string) => {
    const names: { [key: string]: string } = {
      heading: 'Nagłówek',
      text: 'Tekst',
      image: 'Obrazek',
      video: 'Film',
      button: 'Przycisk',
      divider: 'Rozdzielacz',
      spacer: 'Odstęp',
      maps: 'Mapa',
      icon: 'Ikonka',
      container: 'Kontener',
      grid: 'Siatka',
      // Ogólne elementy
      'image-field': 'Pole obrazka',
      'icon-field': 'Pole ikonki',
      carousel: 'Karuzela obrazków',
      accessibility: 'Dostępność A11y',
      gallery: 'Galeria podstawowa',
      'icon-list': 'Lista ikonki',
      counter: 'Licznik',
      'progress-bar': 'Pasek postępu',
      testimonial: 'Referencja',
      cards: 'Karty',
      accordion: 'Akordeon',
      toggle: 'Przełącznik',
      'social-icons': 'Ikonki społecznościowe',
      alert: 'Ostrzeżenie',
      soundcloud: 'SoundCloud',
      shortcode: 'Krótki kod',
      html: 'HTML',
      'menu-anchor': 'Kotwica menu',
      sidebar: 'Panel boczny',
      'learn-more': 'Dowiedz się więcej',
      rating: 'Ocena',
      trustindex: 'Google Recenzje',
      ppom: 'PPOM Shortcode',
      'text-path': 'Ścieżka tekstowa',
    };
    return names[elementType] || 'Element';
  };

  const handleNewElementDrop = async (elementType: string, targetId: string, overData?: any) => {
    console.log('[handleNewElementDrop] Element type:', elementType, 'Target:', targetId, 'OverData:', overData);
    
    try {
      // Check if this is a layout element that should create a section
      const layoutElements = ['container', 'grid'];
      
      if (layoutElements.includes(elementType)) {
        console.log('[handleNewElementDrop] Creating layout section for:', elementType);
        console.log('[handleNewElementDrop] overData:', overData);
        console.log('[handleNewElementDrop] targetId:', targetId);
        
        // Determine target position based on where it was dropped
        let insertPosition = 0;
        let targetSectionIdForPosition: string | null = null;
        
        // Try to get section ID from overData first
        if (overData?.type === 'row-column') {
          // Dropped on a row column - find the parent row
          const childSection = sections.find(s => s.id === overData.rowId);
          if (childSection?.parent_id) {
            targetSectionIdForPosition = childSection.parent_id;
          }
        } else if (overData?.type === 'section') {
          targetSectionIdForPosition = overData.sectionId;
        } else if (overData?.type === 'column') {
          targetSectionIdForPosition = overData.sectionId;
        }
        
        // Fallback to parsing targetId
        if (!targetSectionIdForPosition) {
          if (targetId.startsWith('row-')) {
            targetSectionIdForPosition = targetId.replace('row-', '');
          } else if (targetId.includes('-col-')) {
            targetSectionIdForPosition = targetId.split('-col-')[0];
          } else {
            targetSectionIdForPosition = targetId;
          }
        }
        
        console.log('[handleNewElementDrop] Target section ID for position:', targetSectionIdForPosition);
        
        // Find the target section to determine insert position
        const targetSection = sections.find(s => s.id === targetSectionIdForPosition);
        
        if (targetSection) {
          // Insert after the target section
          const topLevelSections = sections.filter(s => !s.parent_id).sort((a, b) => a.position - b.position);
          const targetIndex = topLevelSections.findIndex(s => s.id === targetSection.id);
          
          if (targetIndex >= 0) {
            // Found the target - insert right after it
            insertPosition = targetSection.position + 1;
          } else {
            // Target is not top-level, find its parent
            if (targetSection.parent_id) {
              const parentSection = sections.find(s => s.id === targetSection.parent_id);
              if (parentSection) {
                insertPosition = parentSection.position + 1;
              } else {
                insertPosition = topLevelSections.length;
              }
            } else {
              insertPosition = topLevelSections.length;
            }
          }
          console.log('[handleNewElementDrop] Inserting after section', targetSection.title, 'at position:', insertPosition);
        } else {
          // If no target found, add at the end
          const topLevelSections = sections.filter(s => !s.parent_id);
          insertPosition = topLevelSections.length;
          console.log('[handleNewElementDrop] No target found, inserting at end position:', insertPosition);
        }
        
        // Determine section type and properties based on element type
        let sectionType: 'row' | 'section' = 'row'; // Both should be rows now
        let rowColumnCount = 1;
        let rowLayoutType: 'equal' | 'custom' = 'equal';
        
        if (elementType === 'container') {
          // Container = simple row with 1 column
          rowColumnCount = 1;
          rowLayoutType = 'equal';
        } else if (elementType === 'grid') {
          // Grid = row with multiple columns (default 3)
          rowColumnCount = 3;
          rowLayoutType = 'equal';
        }
        
        console.log('[handleNewElementDrop] Creating row at position:', insertPosition, 'with columns:', rowColumnCount);
        
        const { data: newSectionData, error: sectionError } = await supabase
          .from('cms_sections')
          .insert([{
            page_id: '8f3009d3-3167-423f-8382-3eab1dce8cb1',
            section_type: sectionType,
            row_column_count: rowColumnCount,
            row_layout_type: rowLayoutType,
            position: insertPosition,
            parent_id: null,
            is_active: true,
            title: elementType === 'container' ? 'Nowy kontener' : 'Nowa siatka',
            width_type: 'full',
            height_type: 'auto',
          }])
          .select()
          .single();
        
        if (sectionError) throw sectionError;
        
        console.log('[handleNewElementDrop] Row created:', newSectionData);
        
        // Update positions of sections that come after the new one
        const sectionsToUpdate = sections
          .filter(s => !s.parent_id && s.position >= insertPosition)
          .map(s => ({
            id: s.id,
            position: s.position + 1
          }));
        
        if (sectionsToUpdate.length > 0) {
          console.log('[handleNewElementDrop] Updating positions for', sectionsToUpdate.length, 'sections');
          
          for (const sect of sectionsToUpdate) {
            await supabase
              .from('cms_sections')
              .update({ position: sect.position, updated_at: new Date().toISOString() })
              .eq('id', sect.id);
          }
        }
        
        // Update local state
        const updatedSections = sections.map(s => 
          !s.parent_id && s.position >= insertPosition 
            ? { ...s, position: s.position + 1 }
            : s
        );
        
        const newSections = [...updatedSections, newSectionData as any].sort((a, b) => {
          if (a.parent_id && !b.parent_id) return 1;
          if (!a.parent_id && b.parent_id) return -1;
          return a.position - b.position;
        });
        
        setSections(newSections);
        saveToHistory(newSections, items);
        setHasUnsavedChanges(true);
        
        // Reinitialize columns
        initializeColumns(newSections, items);
        
        toast({ 
          title: '✅ Dodano wiersz', 
          description: `${getElementTypeName(elementType)} z ${rowColumnCount} ${rowColumnCount === 1 ? 'kolumną' : 'kolumnami'}` 
        });
        return;
      }
      
      // Regular element creation (not layout)
      // Determine target section and position
      let targetSectionId: string;
      let columnIndex = 0;
      
      console.log('[handleNewElementDrop] Processing regular element, overData:', overData);
      
      if (overData?.type === 'row-column') {
        // Dropped into a row column (child section)
        // rowId is actually the child section ID in this context
        targetSectionId = overData.rowId;
        columnIndex = 0; // Child sections typically have single column
        console.log('[handleNewElementDrop] Dropped on row-column (child section):', { targetSectionId, columnIndex });
      } else if (overData?.type === 'column') {
        // Dropped into a column in ColumnLayout
        targetSectionId = overData.sectionId;
        columnIndex = overData.columnIndex;
        console.log('[handleNewElementDrop] Dropped on column:', { targetSectionId, columnIndex });
      } else if (overData?.type === 'section') {
        // Dropped into a regular section
        targetSectionId = overData.sectionId;
        columnIndex = overData.columnIndex || 0;
        console.log('[handleNewElementDrop] Dropped on section:', { targetSectionId, columnIndex });
      } else if (targetId.includes('-col-')) {
        // Fallback: Parse targetId if it contains column info
        const match = targetId.match(/^(.+)-col-(\d+)$/);
        if (match) {
          targetSectionId = match[1];
          columnIndex = parseInt(match[2], 10);
          console.log('[handleNewElementDrop] Parsed from targetId:', { targetSectionId, columnIndex });
        } else {
          toast({ title: 'Błąd', description: 'Nieprawidłowy cel', variant: 'destructive' });
          return;
        }
      } else {
        // Fallback: Use targetId as section id
        targetSectionId = targetId;
        columnIndex = 0;
        console.log('[handleNewElementDrop] Using targetId as sectionId:', { targetSectionId, columnIndex });
      }

      // Find the target section
      console.log('[handleNewElementDrop] Looking for section:', targetSectionId, 'in', sections.length, 'sections');
      const targetSection = sections.find(s => s.id === targetSectionId);
      console.log('[handleNewElementDrop] Found target section:', targetSection ? targetSection.title : 'NOT FOUND');
      
      if (!targetSection) {
        console.error('[handleNewElementDrop] Section not found!', { targetSectionId, availableSections: sections.map(s => ({ id: s.id, title: s.title })) });
        toast({ title: 'Błąd', description: 'Nie znaleziono sekcji docelowej', variant: 'destructive' });
        return;
      }

      // Get existing items in target section/column
      console.log('[handleNewElementDrop] Getting existing items for section:', targetSectionId, 'column:', columnIndex);
      const existingItems = items.filter(it => 
        it.section_id === targetSectionId && 
        (it as any).column_index === columnIndex
      );
      console.log('[handleNewElementDrop] Found existing items:', existingItems.length);
      const newPosition = existingItems.length;

      // Create default content based on element type
      console.log('[handleNewElementDrop] About to create default content for:', elementType);
      const defaultContent = createDefaultContent(elementType);
      console.log('[handleNewElementDrop] Created default content:', defaultContent);

      console.log('[handleNewElementDrop] Creating item:', {
        elementType,
        targetSectionId,
        columnIndex,
        position: newPosition,
        defaultContent
      });

      console.log('[handleNewElementDrop] 🔵 Starting database insert...');
      // Create new item in database - using correct field names
      const { data: newItemData, error: insertError } = await supabase
        .from('cms_items')
        .insert([{
          section_id: targetSectionId,
          page_id: '8f3009d3-3167-423f-8382-3eab1dce8cb1',
          type: elementType,
          title: `Nowy ${getElementTypeName(elementType)}`,
          description: '',
          position: newPosition,
          column_index: columnIndex,
          is_active: true,
          cells: defaultContent as any,
          url: '',
          icon: '',
          media_url: '',
          media_type: '',
          media_alt_text: '',
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[handleNewElementDrop] Insert error:', insertError);
        throw insertError;
      }
      
      console.log('[handleNewElementDrop] Item created in DB:', newItemData);
      console.log('[handleNewElementDrop] Current items count:', items.length);
      console.log('[handleNewElementDrop] Items in target section:', 
        items.filter(i => i.section_id === targetSectionId).length
      );

      // Update local state
      const cellsData = typeof newItemData.cells === 'string' 
        ? JSON.parse(newItemData.cells) 
        : Array.isArray(newItemData.cells) 
          ? newItemData.cells 
          : [];
      
      const convertedItem: CMSItem = {
        ...newItemData,
        cells: cellsData
      };
      
      const newItems = [...items, convertedItem];
      console.log('[handleNewElementDrop] ✅ Item created, updating local state');
      console.log('[handleNewElementDrop] New item:', convertedItem);
      console.log('[handleNewElementDrop] Total items after add:', newItems.length);
      
      // Update state immediately
      setItems(newItems);
      setHasUnsavedChanges(true);
      
      // Increment version to force re-render
      setDragVersion(prev => prev + 1);

      toast({ 
        title: '✅ Element dodany', 
        description: `Element ${getElementTypeName(elementType)} został dodany. Kliknij, aby edytować.` 
      });
    } catch (error) {
      console.error('Error creating new element:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać elementu',
        variant: 'destructive',
      });
    }
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (overId.includes('-col-')) {
      // Lightweight feedback only
      // console.info(`Dragging ${activeId} over column ${overId}`);
    }
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🔴 [DragEnd] TRIGGERED!', event);
    const { active, over } = event;
    console.log('[DragEnd] Active:', active.id, 'Over:', over?.id);
    console.log('[DragEnd] Active data:', active.data.current);
    setActiveId(null);

    if (!over) {
      console.log('[DragEnd] No drop target');
      return;
    }

    // Check if dragging a new element from the panel
    const activeData = active.data.current;
    const dropOverData = over.data?.current;
    
    console.log('[DragEnd] Active data:', activeData);
    console.log('[DragEnd] Over data:', dropOverData);
    console.log('[DragEnd] Over ID:', over.id);
    
    if (activeData?.type === 'new-element') {
      console.log('[DragEnd] Dropping new element:', activeData.elementType, 'to:', over.id);
      await handleNewElementDrop(activeData.elementType, over.id as string, dropOverData);
      return;
    }

    if (active.id === over.id) {
      return;
    }

    if (!isAdmin) {
      toast({ title: 'Brak uprawnień', description: 'Tylko administrator może przenosić/usuwać sekcje', variant: 'destructive' });
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log('Drag end:', { activeId, overId, overData: (over as any).data?.current });

    // Check if dragging a section
    const draggedSection = sections.find(s => s.id === activeId);
    if (draggedSection) {
      const overData = (over as any).data?.current;
      
      // Check if this is row reordering vs regular section nesting
      let targetSectionId = overData?.rowId || overId;
      // Handle "row-{id}" format in overId
      if (targetSectionId.startsWith('row-')) {
        targetSectionId = targetSectionId.replace('row-', '');
      }
      const targetSection = sections.find(s => s.id === targetSectionId);
      const isDraggedRowTopLevel = draggedSection.section_type === 'row' && !draggedSection.parent_id;
      const isTargetRowTopLevel = targetSection?.section_type === 'row' && !targetSection.parent_id;
      
      // If both are top-level rows, skip nesting logic and go to regular reordering
      if (isDraggedRowTopLevel && isTargetRowTopLevel && (overData?.type === 'row-container')) {
        // This is row-to-row reordering, skip to regular logic below
      } else if (overData?.type === 'row-column' || overData?.type === 'row-container') {
        // Regular section-to-row nesting logic
        if (draggedSection.section_type === 'row') {
          // This is trying to nest a row inside another container, block it
          toast({ title: 'Nie można zagnieżdżać wierszy', description: 'Wiersze mogą być tylko na poziomie głównym' });
          return;
        }
        
        if (overData?.rowId === draggedSection.id) {
          return;
        }
        const targetRowId: string = overData.rowId;
        // If a specific column is targeted, use it; otherwise find first free slot
        let targetColumnIndex: number | null = typeof overData.columnIndex === 'number' ? overData.columnIndex : null;

        if (targetColumnIndex === null) {
          const rowSection = sections.find(s => s.id === targetRowId);
          const cols = rowSection?.row_column_count || 1;
          const siblings = sections.filter(s => s.parent_id === targetRowId);
          const taken = new Set(siblings.map(s => (typeof s.position === 'number' ? s.position : 0)));
          let found: number | null = null;
          for (let i = 0; i < cols; i++) {
            if (!taken.has(i)) { found = i; break; }
          }
          targetColumnIndex = found !== null ? found : Math.min(cols - 1, siblings.length);
        }

        console.log(`Moving section ${activeId} to row ${targetRowId}, column ${targetColumnIndex}`);
        
        try {
          const { error } = await supabase
            .from('cms_sections')
            .update({ 
              parent_id: targetRowId,
              position: targetColumnIndex,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeId);
          if (error) throw error;

          // Normalize sibling positions within the row in the database
          const siblings = sections
            .filter(s => s.parent_id === targetRowId && s.id !== activeId)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          
          for (let idx = 0; idx < siblings.length; idx++) {
            const newPosition = idx >= (targetColumnIndex as number) ? idx + 1 : idx;
            if (siblings[idx].position !== newPosition) {
              const { error: updErr } = await supabase
                .from('cms_sections')
                .update({ position: newPosition, updated_at: new Date().toISOString() })
                .eq('id', siblings[idx].id);
              if (updErr) console.warn('Position update warning:', updErr);
            }
          }

          // Update local state instead of refetching everything
          setSections(prev => {
            let updated = prev.map(s => 
              s.id === activeId 
                ? { ...s, parent_id: targetRowId, position: targetColumnIndex as number } 
                : s
            );
            
            const sibs = updated
              .filter(s => s.parent_id === targetRowId && s.id !== activeId)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            sibs.forEach((s, idx) => {
              const newPos = idx >= (targetColumnIndex as number) ? idx + 1 : idx;
              if (s.position !== newPos) {
                updated = updated.map(u => u.id === s.id ? { ...u, position: newPos } : u);
              }
            });

            return updated;
          });

          toast({ title: 'Sekcja przeniesiona', description: 'Sekcja została umieszczona w wierszu' });
        } catch (error) {
          console.error('Error moving section to row:', error);
          toast({ title: 'Błąd', description: 'Nie udało się przenieść sekcji do wiersza', variant: 'destructive' });
        }
        return;
      }

      // Check if both sections are siblings in the same row (need to swap positions)
      const overSection = sections.find(s => s.id === overId);
      if (draggedSection.parent_id && overSection && draggedSection.parent_id === overSection.parent_id) {
        // Swapping siblings within the same row
        try {
          const draggedPosition = draggedSection.position;
          const overPosition = overSection.position;
          
          await Promise.all([
            supabase
              .from('cms_sections')
              .update({ position: overPosition, updated_at: new Date().toISOString() })
              .eq('id', activeId),
            supabase
              .from('cms_sections')
              .update({ position: draggedPosition, updated_at: new Date().toISOString() })
              .eq('id', overId)
          ]);
          
          // Update local state
          setSections(prev => prev.map(s => {
            if (s.id === activeId) return { ...s, position: overPosition };
            if (s.id === overId) return { ...s, position: draggedPosition };
            return s;
          }));
          
          // Refresh data to ensure consistency
          await fetchData();
          
          toast({ title: 'Sekcje zamienione', description: 'Pozycje sekcji zostały zamienione' });
        } catch (error) {
          console.error('Error swapping sections:', error);
          toast({ title: 'Błąd', description: 'Nie udało się zamienić sekcji', variant: 'destructive' });
        }
        return;
      }

      // Regular section reordering (top-level sections only)
      const topLevelSections = sections.filter(s => !s.parent_id);
      const oldIndex = topLevelSections.findIndex(s => s.id === activeId);
      
      // For row containers, extract real ID from "row-{id}" format
      let realOverId = overId;
      if (overId.startsWith('row-')) {
        realOverId = overId.replace('row-', '');
      }
      const newIndex = topLevelSections.findIndex(s => s.id === realOverId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Move section from row to top-level or reorder top-level
        if (draggedSection.parent_id) {
          // Moving from row to top-level
          try {
            const { error } = await supabase
              .from('cms_sections')
              .update({ 
                parent_id: null,
                position: newIndex,
                updated_at: new Date().toISOString()
              })
              .eq('id', activeId);
              
            if (error) throw error;
            await fetchData();
            
            toast({
              title: 'Sekcja przeniesiona',
              description: 'Sekcja została przeniesiona na poziom główny',
            });
          } catch (error) {
            console.error('Error moving section to top-level:', error);
            toast({
              title: 'Błąd',
              description: 'Nie udało się przenieść sekcji',
              variant: 'destructive',
            });
          }
        } else {
          // Regular reordering of top-level sections
          const reorderedTopLevel = arrayMove(topLevelSections, oldIndex, newIndex);
          // Recalculate explicit positions for top-level sections to persist correctly
          const updatedTopLevel = reorderedTopLevel.map((s, idx) => ({
            ...s,
            parent_id: null,
            position: idx,
          }));
          const allOtherSections = sections.filter(s => s.parent_id);
          const newSections = [...updatedTopLevel, ...allOtherSections];
          saveToHistory(newSections, items);
          setSections(newSections);
          setHasUnsavedChanges(true);
          // Auto-save the reordered sections (edge function updates DB)
          autoSave(newSections, items);
        }
      }
      return;
    }

    // Find item in current column structure
    const findItemInColumns = (itemId: string) => {
      for (const [sectionId, cols] of Object.entries(sectionColumns)) {
        for (let colIndex = 0; colIndex < cols.length; colIndex++) {
          const itemIndex = cols[colIndex].items.findIndex(item => item.id === itemId);
          if (itemIndex !== -1) {
            return { sectionId, colIndex, itemIndex, item: cols[colIndex].items[itemIndex] };
          }
        }
      }
      return null;
    };

    const activeItemLocation = findItemInColumns(activeId);
    if (!activeItemLocation) {
      console.log('Active item not found in columns');
      return;
    }

    let targetSectionId: string;
    let targetColIndex: number;
    let targetItemIndex: number | null = null;

    // Check if dropping on a column
    const overData = (over as any).data?.current;
    // Ignore dropping items on row droppables
    if (overData?.type === 'row-column' || overData?.type === 'row-container') {
      return;
    }
    if (overData?.type === 'column') {
      targetSectionId = overData.sectionId;
      targetColIndex = overData.columnIndex;
      console.log('Dropping on column:', { targetSectionId, targetColIndex });
    } else {
      // Dropping on another item
      const targetItemLocation = findItemInColumns(overId);
      if (!targetItemLocation) {
        console.log('Target item not found');
        return;
      }
      targetSectionId = targetItemLocation.sectionId;
      targetColIndex = targetItemLocation.colIndex;
      targetItemIndex = targetItemLocation.itemIndex;
      console.log('Dropping on item:', { targetSectionId, targetColIndex, targetItemIndex });
    }

    // Create new column structure
    const newSectionColumns = { ...sectionColumns };
    Object.keys(newSectionColumns).forEach(sectionId => {
      newSectionColumns[sectionId] = newSectionColumns[sectionId].map(col => ({
        ...col,
        items: [...col.items]
      }));
    });

    // Remove item from source
    const sourceCol = newSectionColumns[activeItemLocation.sectionId][activeItemLocation.colIndex];
    const [movedItem] = sourceCol.items.splice(activeItemLocation.itemIndex, 1);

    // Update item's section_id and column_index
    const updatedItem: any = {
      ...movedItem,
      section_id: targetSectionId,
      column_index: targetColIndex,
    };

    // Add to target
    const targetCol = newSectionColumns[targetSectionId]?.[targetColIndex];
    if (!targetCol) {
      console.log('Target column not found');
      return;
    }

    if (targetItemIndex !== null) {
      // Insert at specific position
      let insertIndex = targetItemIndex;
      // Adjust if moving within same column and from earlier position
      if (activeItemLocation.sectionId === targetSectionId && 
          activeItemLocation.colIndex === targetColIndex && 
          activeItemLocation.itemIndex < targetItemIndex) {
        insertIndex = targetItemIndex - 1;
      }
      targetCol.items.splice(insertIndex, 0, updatedItem);
    } else {
      // Add to end of column
      targetCol.items.push(updatedItem);
    }

    // Update state
    setSectionColumns(newSectionColumns);

    // Rebuild items array maintaining order
    const newItems = [];
    sections.forEach(section => {
      const cols = newSectionColumns[section.id] || [];
      cols.forEach((col, colIdx) => {
        col.items.forEach((it: any) => {
          newItems.push({ ...it, column_index: colIdx });
        });
      });
    });

    saveToHistory(sections, newItems);
    setItems(newItems);
    setHasUnsavedChanges(true);
    
    console.log('Updated items:', newItems.map(i => ({ id: i.id, section_id: i.section_id })));
    setDragVersion((v) => v + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setSections(prevState.sections);
      setItems(prevState.items);
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSections(nextState.sections);
      setItems(nextState.items);
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Cancel any pending autosave to avoid race conditions overriding latest sizes
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      // Build payload for edge function - include size fields and row layout so latest widths persist
      const sectionsPayload = sections.map((s) => ({ id: s.id, position: s.position, width_type: s.width_type, height_type: s.height_type, custom_width: s.custom_width ?? null, custom_height: s.custom_height ?? null, row_layout_type: (s as any).row_layout_type ?? null }));

      const itemsBySection: { [key: string]: CMSItem[] } = {};
      items.forEach((it) => {
        const sid = (it.section_id as string) || '';
        if (!sid) return;
        if (!itemsBySection[sid]) itemsBySection[sid] = [];
        itemsBySection[sid].push(it);
      });

      const itemsPayload: { id: string; section_id: string; position: number; column_index?: number }[] = [];
      Object.entries(itemsBySection).forEach(([sid, arr]) => {
        arr.forEach((it: any, idx) => {
          itemsPayload.push({ id: it.id as string, section_id: sid, position: idx, column_index: typeof it.column_index === 'number' ? it.column_index : 0 });
        });
      });

      const { data, error } = await supabase.functions.invoke('save-cms-layout', {
        body: { sections: sectionsPayload, items: itemsPayload },
      });
      if (error) throw error;
      if (!data?.ok) {
        console.error('Save returned non-ok response:', data);
        throw new Error('Save did not complete successfully');
      }

      // Reload from DB to ensure persisted order/state
      await fetchData();

      // Notify all clients (including homepage) to refresh layout
      const channel = supabase.channel('cms-live');
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'layout-updated',
            payload: { at: Date.now() },
          });
          supabase.removeChannel(channel);
        }
      });

      setHasUnsavedChanges(false);
      setAutoSaveStatus('saved');
      toast({
        title: 'Sukces',
        description: 'Układ został zapisany poprawnie',
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to save layout',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        fetchData(); // Reload original data
        setEditMode(false);
        setHasUnsavedChanges(false);
        setSelectedElement(null);
      }
    } else {
      setEditMode(false);
      setSelectedElement(null);
    }
  };

  const handleElementResize = async (elementId: string, width: number, height: number) => {
    console.log(`Element ${elementId} resized to ${width}x${height}`);
    setHasUnsavedChanges(true);
    
    try {
      // Check if it's a section or item
      const section = sections.find(s => s.id === elementId);
      
      if (section) {
        // Determine width settings
        let width_type = section.width_type || 'full';
        let newCustomWidth = section.custom_width;
        
        if (Number.isFinite(width) && width > 0) {
          width_type = 'custom';
          newCustomWidth = Math.round(width);
        } else if (width === 0) {
          // Reset to auto width
          width_type = 'full';
          newCustomWidth = null;
        } else {
          console.warn(`Ignored width resize for ${elementId}: invalid width (${width}). Keeping previous width settings.`);
        }

        // Determine height settings  
        let height_type = section.height_type || 'auto';
        let newCustomHeight = section.custom_height;
        
        if (Number.isFinite(height) && height > 0) {
          height_type = 'custom';
          newCustomHeight = Math.round(height);
        } else if (height === 0) {
          // Reset to auto height
          height_type = 'auto';
          newCustomHeight = null;
        } else {
          console.warn(`Ignored height resize for ${elementId}: invalid height (${height}). Keeping previous height settings.`);
        }

        console.log(`Updating section ${elementId} with width_type: ${width_type}, height_type: ${height_type}, custom_width: ${newCustomWidth}, custom_height: ${newCustomHeight}`);

        // Update local state and persist via Edge Function autosave (service role)
        setSections(prev => {
          const updated = prev.map(s => 
            s.id === elementId 
              ? { 
                  ...s, 
                  width_type,
                  height_type,
                  custom_width: newCustomWidth, 
                  custom_height: newCustomHeight,
                }
              : s
          ).map(s => {
            // If resized section is inside a row, ensure that row uses custom layout so widths take effect
            if (section.parent_id && s.id === section.parent_id && s.section_type === 'row' && s.row_layout_type !== 'custom') {
              return { ...s, row_layout_type: 'custom' } as any;
            }
            return s;
          });

          // Schedule autosave to persist sizes and ordering reliably
          autoSave(updated, items);
          return updated;
        });

        // Persist immediately to DB to avoid debounce race conditions
        try {
          const updates: any = { 
            width_type, 
            height_type, 
            custom_width: newCustomWidth, 
            custom_height: newCustomHeight, 
            updated_at: new Date().toISOString() 
          };
          const { error: immediateErr } = await supabase
            .from('cms_sections')
            .update(updates)
            .eq('id', elementId);
          if (immediateErr) {
            console.error('Immediate resize save failed', immediateErr);
          }
        } catch (e) {
          console.error('Immediate width save exception', e);
        }

        // If section is in a row, switch row to custom layout so custom widths are visible
        if (section.parent_id) {
          const parentRow = sections.find(s => s.id === section.parent_id && s.section_type === 'row');
          if (parentRow && parentRow.row_layout_type !== 'custom') {
            try {
              await supabase
                .from('cms_sections')
                .update({ row_layout_type: 'custom', updated_at: new Date().toISOString() })
                .eq('id', parentRow.id);
            } catch (e) {
              console.error('Parent row layout switch failed', e);
            }
          }
        }
      } else {
        // TODO: Add item resize handling if needed
      }

        toast({
          title: 'Sukces',
          description: 'Rozmiar sekcji został zapisany',
        });
    } catch (error) {
      console.error('Error saving element resize:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można zapisać rozmiaru elementu',
        variant: 'destructive',
      });
    }
  };

  const handleLayoutModeChange = (mode: 'single' | 'columns' | 'grid') => {
    setLayoutMode(mode);
    setHasUnsavedChanges(true);
    // Persist page-level sections grid layout
    savePageSettings(mode, columnCount);
  };

  const handleColumnCountChange = (count: number) => {
    setColumnCount(count);
    setHasUnsavedChanges(true);
    // Persist page-level sections grid layout
    savePageSettings(layoutMode, count);
  };
  const handleColumnsChange = async (sectionId: string, columns: Column[]) => {
    setSectionColumns(prev => ({
      ...prev,
      [sectionId]: columns,
    }));
    
    const allItemsFromColumns: any[] = [];
    columns.forEach((col, colIdx) => {
      col.items.forEach((it: any) => allItemsFromColumns.push({ ...it, column_index: colIdx }));
    });
    const otherSectionItems = items.filter(item => item.section_id !== sectionId);
    const newItems = [...otherSectionItems, ...allItemsFromColumns];
    
    setItems(newItems);
    setHasUnsavedChanges(true);
    
    try {
      // Save column count in section's style_class (temporary solution)
      const columnCount = columns.length;
      const currentSection = sections.find(s => s.id === sectionId);
      const updatedStyleClass = `columns-${columnCount}`;
      
      const { error } = await supabase
        .from('cms_sections')
        .update({ 
          style_class: updatedStyleClass,
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId);
      
      if (error) throw error;
      
      // Update local state
      setSections(prev => prev.map(s => 
        s.id === sectionId 
          ? { ...s, style_class: updatedStyleClass }
          : s
      ));
      
      toast({
        title: 'Sukces',
        description: `Liczba kolumn (${columnCount}) została zapisana`,
      });
    } catch (error) {
      console.error('Error saving column count:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można zapisać liczby kolumn',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivateElement = async (elementId: string) => {
    try {
      // Check if it's a section or item
      const isSection = sections.find(s => s.id === elementId);
      const isItem = items.find(i => i.id === elementId);
      
      if (!isSection && !isItem) {
        toast({
          title: 'Błąd',
          description: 'Element nie został znaleziony',
          variant: 'destructive',
        });
        return;
      }

      const elementType = isSection ? 'section' : 'item';
      const elementName = isSection ? isSection.title : (isItem?.title || isItem?.type);

      if (!confirm(`Czy na pewno chcesz ukryć "${elementName}"? Możesz go aktywować ponownie w zarządzaniu nieaktywnymi elementami.`)) {
        return;
      }

      // Use edge function with service role to avoid RLS issues
      const { data, error } = await supabase.functions.invoke('hide-cms-element', {
        body: { id: elementId, elementType, isActive: false },
      });

      if (error || data?.ok === false) {
        throw new Error(error?.message || data?.error || 'Unknown error');
      }

      // Remove from local state
      if (elementType === 'section') {
        setSections(prev => prev.filter(s => s.id !== elementId));
      } else {
        setItems(prev => prev.filter(i => i.id !== elementId));
      }

      setSelectedElement(null);
      setHasUnsavedChanges(false); // Element was removed, no need to save

      toast({
        title: 'Sukces',
        description: `${elementType === 'section' ? 'Sekcja' : 'Element'} został ukryty`,
      });

    } catch (error) {
      console.error('Error deactivating element:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można ukryć elementu',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateElement = async () => {
    if (!selectedElement) return;
    
    const isSection = sections.find(s => s.id === selectedElement);
    const isItem = items.find(i => i.id === selectedElement);
    
    if (isSection) {
      try {
        const { data, error } = await supabase
          .from('cms_sections')
          .insert({
            title: `${isSection.title} (kopia)`,
            description: isSection.description,
            position: sections.length,
            visible_to_everyone: isSection.visible_to_everyone,
             visible_to_clients: isSection.visible_to_clients,
             visible_to_partners: isSection.visible_to_partners,
             visible_to_specjalista: isSection.visible_to_specjalista,
             visible_to_anonymous: isSection.visible_to_anonymous,
            background_color: isSection.background_color,
            text_color: isSection.text_color,
            style_class: isSection.style_class
          })
          .select()
          .single();
          
        if (error) throw error;
        
        setSections(prev => [...prev, convertSupabaseSection(data)]);
        toast({
          title: 'Sukces',
          description: 'Sekcja została zduplikowana',
        });
      } catch (error) {
        console.error('Error duplicating section:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zduplikować sekcji',
          variant: 'destructive',
        });
      }
    } else if (isItem) {
      try {
        const { data, error } = await supabase
          .from('cms_items')
          .insert({
            section_id: isItem.section_id,
            type: isItem.type,
            title: isItem.title ? `${isItem.title} (kopia)` : null,
            description: isItem.description,
            url: isItem.url,
            position: items.filter(i => i.section_id === isItem.section_id).length,
            column_index: 0
          })
          .select()
          .single();
          
        if (error) throw error;
        
        setItems(prev => [...prev, data as unknown as CMSItem]);
        toast({
          title: 'Sukces',
          description: 'Element został zduplikowany',
        });
      } catch (error) {
        console.error('Error duplicating item:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zduplikować elementu',
          variant: 'destructive',
        });
      }
    }
  };

  const handleResetElement = async () => {
    if (!selectedElement) return;
    
    const isSection = sections.find(s => s.id === selectedElement);
    
    if (isSection) {
      try {
        const { error } = await supabase
          .from('cms_sections')
          .update({ 
            custom_width: null,
            custom_height: null,
            width_type: 'full',
            height_type: 'auto',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedElement);
        
        if (error) throw error;
        
        setSections(prev => prev.map(s => 
          s.id === selectedElement 
            ? { ...s, custom_width: null, custom_height: null, width_type: 'full', height_type: 'auto' }
            : s
        ));
        
        toast({
          title: 'Sukces',
          description: 'Rozmiar elementu został zresetowany',
        });
      } catch (error) {
        console.error('Error resetting element:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zresetować rozmiaru elementu',
          variant: 'destructive',
        });
      }
    }
  };

  const handleElementSettings = async () => {
    if (!selectedElement) return;
    
    const isSection = sections.find(s => s.id === selectedElement);
    const isItem = items.find(i => i.id === selectedElement);
    
    if (isSection) {
      // For now, show a simple prompt to change section title
      const newTitle = prompt('Zmień tytuł sekcji:', isSection.title);
      if (newTitle && newTitle !== isSection.title) {
        try {
          const { error } = await supabase
            .from('cms_sections')
            .update({ 
              title: newTitle,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedElement);
          
          if (error) throw error;
          
          setSections(prev => prev.map(s => 
            s.id === selectedElement 
              ? { ...s, title: newTitle }
              : s
          ));
          
          toast({
            title: 'Sukces',
            description: 'Tytuł sekcji został zmieniony',
          });
        } catch (error) {
          console.error('Error updating section title:', error);
          toast({
            title: 'Błąd',
            description: 'Nie można zmienić tytułu sekcji',
            variant: 'destructive',
          });
        }
      }
    } else if (isItem) {
      // For items, show a simple prompt to change item title
      const newTitle = prompt('Zmień tytuł elementu:', isItem.title || '');
      if (newTitle && newTitle !== isItem.title) {
        try {
          const { error } = await supabase
            .from('cms_items')
            .update({ 
              title: newTitle,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedElement);
          
          if (error) throw error;
          
          setItems(prev => prev.map(i => 
            i.id === selectedElement 
              ? { ...i, title: newTitle }
              : i
          ));
          
          toast({
            title: 'Sukces',
            description: 'Tytuł elementu został zmieniony',
          });
        } catch (error) {
          console.error('Error updating item title:', error);
          toast({
            title: 'Błąd',
            description: 'Nie można zmienić tytułu elementu',
            variant: 'destructive',
          });
        }
      }
    }
  };

  const handleAlignElement = async (alignment: 'left' | 'center' | 'right' | 'justify') => {
    if (!selectedElement) return;
    
    const isSection = sections.find(s => s.id === selectedElement);
    
    if (isSection) {
      try {
        const map: Record<string, { justify_content: string; align_items: string }> = {
          left: { justify_content: 'flex-start', align_items: 'flex-start' },
          center: { justify_content: 'center', align_items: 'center' },
          right: { justify_content: 'flex-end', align_items: 'flex-end' },
          justify: { justify_content: 'space-between', align_items: 'center' },
        };
        const mapped = map[alignment];
        const { error } = await supabase
          .from('cms_sections')
          .update({ 
            alignment,
            justify_content: mapped.justify_content,
            align_items: mapped.align_items,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedElement);
        
        if (error) throw error;
        
        setSections(prev => prev.map(s => 
          s.id === selectedElement 
            ? { ...s, alignment, justify_content: mapped.justify_content, align_items: mapped.align_items }
            : s
        ));
        
        toast({
          title: 'Sukces',
          description: `Wyrównanie ustawione na ${alignment}`,
        });
      } catch (error) {
        console.error('Error aligning element:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zmienić wyrównania elementu',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSizeElement = async (sizeType: 'fit' | 'full') => {
    if (!selectedElement) return;
    
    const isSection = sections.find(s => s.id === selectedElement);
    
    if (isSection) {
      try {
        const width_type = sizeType === 'fit' ? 'custom' : 'full';
        const custom_width = sizeType === 'fit' ? 400 : null;
        
        const { error } = await supabase
          .from('cms_sections')
          .update({ 
            width_type,
            custom_width,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedElement);
        
        if (error) throw error;
        
        setSections(prev => prev.map(s => 
          s.id === selectedElement 
            ? { ...s, width_type, custom_width }
            : s
        ));
        
        toast({
          title: 'Sukces',
          description: `Rozmiar ustawiony na ${sizeType === 'fit' ? 'dopasowany' : 'pełna szerokość'}`,
        });
      } catch (error) {
        console.error('Error sizing element:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zmienić rozmiaru elementu',
          variant: 'destructive',
        });
      }
    }
  };

  // Item management handlers
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [sidePanelMode, setSidePanelMode] = useState<'elements' | 'edit'>('elements');
  
  const handleEditItem = (itemId: string) => {
    setEditingItemId(itemId);
    setSelectedElement(itemId);
    setSidePanelMode('edit');
  };

  const handleSaveItem = async (updatedItem: Partial<CMSItem>) => {
    if (!editingItemId) return;
    
    try {
      const { error } = await supabase
        .from('cms_items')
        .update({
          type: updatedItem.type,
          title: updatedItem.title,
          description: updatedItem.description,
          url: updatedItem.url,
          icon: updatedItem.icon,
          media_url: updatedItem.media_url,
          media_type: updatedItem.media_type,
          media_alt_text: updatedItem.media_alt_text,
          cells: updatedItem.cells as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItemId);
      
      if (error) throw error;
      
      setItems(prev => prev.map(i => i.id === editingItemId ? { ...i, ...updatedItem } as CMSItem : i));
      saveToHistory(sections, items.map(i => i.id === editingItemId ? { ...i, ...updatedItem } as CMSItem : i));
      setHasUnsavedChanges(true);
      setSidePanelMode('elements');
      setEditingItemId(null);
      
      toast({
        title: 'Sukces',
        description: 'Element został zapisany',
      });
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można zapisać elementu',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cms_items')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      
      if (error) throw error;
      
      setItems(prev => prev.filter(i => i.id !== itemId));
      saveToHistory(sections, items.filter(i => i.id !== itemId));
      setHasUnsavedChanges(true);
      
      toast({
        title: 'Sukces',
        description: 'Element został usunięty',
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można usunąć elementu',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .insert([{
          section_id: item.section_id,
          type: item.type,
          title: item.title ? `${item.title} (kopia)` : null,
          description: item.description,
          url: item.url,
          icon: item.icon,
          media_url: item.media_url,
          media_type: item.media_type,
          media_alt_text: item.media_alt_text,
          position: items.filter(i => i.section_id === item.section_id).length,
          column_index: (item as any).column_index || 0,
          cells: item.cells as any
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setItems(prev => [...prev, data as unknown as CMSItem]);
      saveToHistory(sections, [...items, data as unknown as CMSItem]);
      setHasUnsavedChanges(true);
      
      toast({
        title: 'Sukces',
        description: 'Element został zduplikowany',
      });
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można zduplikować elementu',
        variant: 'destructive',
      });
    }
  };

  const handleMoveItemUp = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const sectionItems = items
      .filter(i => i.section_id === item.section_id && (i as any).column_index === (item as any).column_index)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    const currentIndex = sectionItems.findIndex(i => i.id === itemId);
    if (currentIndex <= 0) return;
    
    const newItems = [...sectionItems];
    [newItems[currentIndex], newItems[currentIndex - 1]] = [newItems[currentIndex - 1], newItems[currentIndex]];
    
    // Update positions in database
    await Promise.all(newItems.map((item, idx) =>
      supabase
        .from('cms_items')
        .update({ position: idx, updated_at: new Date().toISOString() })
        .eq('id', item.id as string)
    ));
    
    // Update local state
    setItems(prev => prev.map(i => {
      const newItem = newItems.find(ni => ni.id === i.id);
      return newItem ? { ...i, position: newItem.position } : i;
    }));
    
    setHasUnsavedChanges(true);
  };

  const handleMoveItemDown = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const sectionItems = items
      .filter(i => i.section_id === item.section_id && (i as any).column_index === (item as any).column_index)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    const currentIndex = sectionItems.findIndex(i => i.id === itemId);
    if (currentIndex >= sectionItems.length - 1) return;
    
    const newItems = [...sectionItems];
    [newItems[currentIndex], newItems[currentIndex + 1]] = [newItems[currentIndex + 1], newItems[currentIndex]];
    
    // Update positions in database
    await Promise.all(newItems.map((item, idx) =>
      supabase
        .from('cms_items')
        .update({ position: idx, updated_at: new Date().toISOString() })
        .eq('id', item.id as string)
    ));
    
    // Update local state
    setItems(prev => prev.map(i => {
      const newItem = newItems.find(ni => ni.id === i.id);
      return newItem ? { ...i, position: newItem.position } : i;
    }));
    
    setHasUnsavedChanges(true);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You need admin privileges to access the Layout Editor.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading Layout Editor...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inactive Elements Manager - visible at top */}
      <InactiveElementsManager
        onElementActivated={(activatedSections, activatedItems) => {
          console.log('Elements activated without refresh:', { 
            sections: activatedSections.length, 
            items: activatedItems.length 
          });
          
          // Update local state without full refetch
          if (activatedSections.length > 0) {
            setSections(prev => {
              const newSections = [...prev];
              activatedSections.forEach(activated => {
                const idx = newSections.findIndex(s => s.id === activated.id);
                if (idx >= 0) {
                  newSections[idx] = { ...newSections[idx], is_active: true };
                } else {
                  newSections.push(activated as CMSSection);
                }
              });
              return newSections;
            });
          }
          
          if (activatedItems.length > 0) {
            setItems(prev => {
              const newItems = [...prev];
              activatedItems.forEach(activated => {
                const idx = newItems.findIndex(i => i.id === activated.id);
                if (idx >= 0) {
                  newItems[idx] = { ...newItems[idx], is_active: true };
                } else {
                  newItems.push(activated as CMSItem);
                }
              });
              return newItems;
            });
          }
          
          setDragVersion(prev => prev + 1);
          setInactiveRefresh(prev => prev + 1);
        }}
        onElementDeleted={(deletedSections, deletedItems) => {
          console.log('Elements deleted without refresh:', { 
            sections: deletedSections.length, 
            items: deletedItems.length 
          });
          
          // Remove from local state without full refetch
          if (deletedSections.length > 0) {
            setSections(prev => prev.filter(s => !deletedSections.includes(s.id)));
          }
          
          if (deletedItems.length > 0) {
            setItems(prev => prev.filter(i => !deletedItems.includes(i.id)));
          }
          
          setInactiveRefresh(prev => prev + 1);
        }}
        refreshKey={inactiveRefresh}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Layout Editor
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={fetchData} 
                variant="outline" 
                size="sm" 
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                Odśwież dane
              </Button>
              {!editMode && (
                <Button onClick={() => setEditMode(true)} className="gap-2">
                  <Edit3 className="w-4 h-4" />
                  Enable Edit Mode
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {editMode 
              ? "Drag and drop sections and items to reorder them. Resize elements and create column layouts. Changes are auto-saved."
              : "Click 'Enable Edit Mode' to start rearranging your page layout with advanced controls."
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {editMode && (
        <>
          <EditingToolbar
            isVisible={editMode}
            onSave={handleSave}
            onCancel={handleCancel}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            autoSaveStatus={autoSaveStatus}
            currentDevice={currentDevice}
            onDeviceChange={setCurrentDevice}
          />
        </>
      )}

      <LayoutControls
        isVisible={editMode}
        selectedElement={selectedElement}
        layoutMode={layoutMode}
        columnCount={columnCount}
        onLayoutModeChange={handleLayoutModeChange}
        onColumnCountChange={handleColumnCountChange}
        onDuplicateElement={handleDuplicateElement}
        onDeleteElement={() => {
          if (selectedElement) {
            handleDeactivateElement(selectedElement);
          }
        }}
        onResetElement={handleResetElement}
        onElementSettings={handleElementSettings}
        onAlignElement={handleAlignElement}
        onSizeElement={handleSizeElement}
        sections={sections}
        items={items}
      />

      <div className={`${editMode ? 'flex gap-0' : ''}`}>
        <div className={`space-y-6 ${editMode ? 'pb-32 ml-80' : ''} flex-1`}>
          <DeviceFrame device={currentDevice} className="mx-auto">
          <DragDropProvider
            items={[
              ...sections.map(s => s.id),
              ...items.filter(i => i.id).map(i => i.id as string),
              // Add all possible new elements from panel
              'new-heading', 'new-image', 'new-text', 'new-video', 'new-button',
              'new-divider', 'new-spacer', 'new-maps', 'new-icon', 'new-container', 'new-grid',
              'new-image-field', 'new-icon-field', 'new-carousel', 'new-accessibility',
              'new-gallery', 'new-icon-list', 'new-counter', 'new-progress-bar',
              'new-testimonial', 'new-cards', 'new-accordion', 'new-toggle',
              'new-social-icons', 'new-alert', 'new-soundcloud', 'new-shortcode',
              'new-html', 'new-menu-anchor', 'new-sidebar', 'new-learn-more',
              'new-rating', 'new-trustindex', 'new-ppom', 'new-text-path'
            ]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            activeId={activeId}
            dragOverlay={
              activeId ? (
                (() => {
                  // Handle new elements from panel
                  if (typeof activeId === 'string' && activeId.startsWith('new-')) {
                    const elementType = activeId.replace('new-', '');
                    return (
                      <div className="bg-primary text-primary-foreground border rounded px-3 py-2 shadow-lg text-sm font-medium">
                        + Dodaj: {getElementTypeName(elementType)}
                      </div>
                    );
                  }
                  
                  const activeItem = items.find(i => i.id === activeId);
                  if (activeItem) {
                    return (
                      <div className="bg-background border rounded px-3 py-2 shadow-md text-sm">
                        {activeItem.title || activeItem.type}
                      </div>
                    );
                  }
                  const activeSection = sections.find(s => s.id === activeId);
                  if (activeSection) {
                    return (
                      <div className="bg-background border rounded px-3 py-2 shadow-md text-sm">
                        Sekcja: {activeSection.title}
                      </div>
                    );
                  }
                  return null;
                })()
              ) : null
            }
            disabled={!editMode}
          >
            {editMode && (
              <div className="fixed left-0 top-0 h-screen z-40">
                <SidePanel
                  mode={sidePanelMode}
                  editingItem={editingItemId ? items.find(i => i.id === editingItemId) : null}
                  sectionId={editingItemId ? items.find(i => i.id === editingItemId)?.section_id : ''}
                  onModeChange={setSidePanelMode}
                  onSave={handleSaveItem}
                  onCancel={() => {
                    setSidePanelMode('elements');
                    setEditingItemId(null);
                  }}
                />
              </div>
            )}
            
          <SortableContext
            items={sections.filter(s => !s.parent_id).map(s => s.id)} 
            strategy={verticalListSortingStrategy}
          >
            {/* Row Containers Demo - visible only in edit mode */}
            {editMode && <SimpleRowDemo onRowCreated={fetchData} />}
            
            <div
              className={cn(
                layoutMode === 'single' && 'flex flex-col gap-6',
                layoutMode !== 'single' && 'grid gap-6'
              )}
              style={layoutMode !== 'single' ? { gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, columnCount))}, minmax(0, 1fr))` } : undefined}
            >
              {sections.filter(s => !s.parent_id).map((section) => {
                // Render row containers
                if (section.section_type === 'row') {
                  return (
                    <DraggableSection
                      key={`${section.id}-${dragVersion}`}
                      id={section.id}
                      isEditMode={editMode}
                      className="w-full"
                    >
                      <RowContainer
                        row={section}
                        sections={sections}
                        isEditMode={editMode}
                        onUpdateRow={async (rowId, updates) => {
                          try {
                            const { error } = await supabase
                              .from('cms_sections')
                              .update({ ...updates, updated_at: new Date().toISOString() })
                              .eq('id', rowId);
                            if (error) throw error;
                            await fetchData();
                          } catch (error) {
                            console.error('Error updating row:', error);
                          }
                        }}
                         onRemoveRow={async (rowId) => {
                          if (!isAdmin) {
                            toast({ title: 'Brak uprawnień', description: 'Tylko administrator może usuwać wiersze', variant: 'destructive' });
                            return;
                          }
                          console.log('Attempting to remove row:', rowId);
                          try {
                            // Call the server function to safely remove the row
                            const { error } = await supabase.rpc('admin_remove_row', { row_id: rowId });
                            
                            if (error) {
                              console.error('Database error:', error);
                              throw error;
                            }
                            
                            await fetchData();
                            setInactiveRefresh((v) => v + 1);
                            toast({ title: 'Wiersz usunięty', description: 'Wiersz został usunięty, a sekcje przeniesione na główny poziom oraz przeniesiony do "Główna" jako nieaktywny' });
                          } catch (error) {
                            console.error('Error removing row:', error);
                            toast({ 
                              title: 'Błąd', 
                              description: `Nie udało się usunąć wiersza: ${error.message || 'Nieznany błąd'}`, 
                              variant: 'destructive' 
                            });
                          }
                        }}
                        onSelectSection={setSelectedElement}
                        selectedElement={selectedElement}
                        items={items}
                        sectionColumns={sectionColumns}
                        onColumnsChange={handleColumnsChange}
                        onElementResize={handleElementResize}
                        activeId={activeId}
                        openStates={openSections}
                        onOpenChange={(id, open) => setOpenSections((prev) => ({ ...prev, [id]: open }))}
                        renderVersion={dragVersion}
                      />
                    </DraggableSection>
                  );
                }

                // Render regular sections - match homepage display with white background
                const sectionItems = items.filter(item => item.section_id === section.id);
                
                // Check if section has column layout
                const columnMatch = section.style_class?.match(/columns-(\d+)/);
                const sectionColumnCount = columnMatch ? parseInt(columnMatch[1], 10) : 0;
                
                // Group items by column_index if columns are defined
                let itemsByColumn: CMSItem[][] = [];
                if (sectionColumnCount > 0) {
                  itemsByColumn = Array.from({ length: sectionColumnCount }, () => []);
                  sectionItems.forEach(item => {
                    const colIdx = Math.min(sectionColumnCount - 1, Math.max(0, (item as any).column_index || 0));
                    itemsByColumn[colIdx].push(item);
                  });
                }
                
                console.log(`[Render] Section ${section.id} (${section.title}): ${sectionItems.length} items, dragVersion: ${dragVersion}`);
                console.log(`[Render] Section items:`, sectionItems.map(i => ({ id: i.id, type: i.type })));
                console.log(`[Render] Total items in state: ${items.length}`);
                
                return (
                  <DraggableSection
                    key={`${section.id}-${dragVersion}-${sectionItems.length}`}
                    id={section.id}
                    isEditMode={editMode}
                    className="w-full"
                  >
                    <RegularSectionContent
                      key={`content-${section.id}-${dragVersion}-${sectionItems.length}`}
                      section={section}
                      sectionItems={sectionItems}
                      sectionColumnCount={sectionColumnCount}
                      itemsByColumn={itemsByColumn}
                      editMode={editMode}
                      selectedElement={selectedElement}
                      activeId={activeId}
                      expandedItemId={expandedItemId}
                      onSelectElement={setSelectedElement}
                      onToggleExpand={setExpandedItemId}
                      onEditItem={handleEditItem}
                      onDeleteItem={handleDeleteItem}
                      onDuplicateItem={handleDuplicateItem}
                      onMoveItemUp={handleMoveItemUp}
                      onMoveItemDown={handleMoveItemDown}
                    />
                  </DraggableSection>
                );
              })}
            </div>
          </SortableContext>
        </DragDropProvider>
        </DeviceFrame>
        </div>
      </div>
    </div>
  );
};