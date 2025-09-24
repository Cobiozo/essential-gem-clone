import React, { useState, useEffect, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, Loader2, Layout, Columns } from 'lucide-react';
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
import { CMSSection, CMSItem } from '@/types/cms';
import { RowContainer } from './RowContainer';
// import { DndDiagnostics } from './DndDiagnostics';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
}

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
  
  // Column layout state
  const [sectionColumns, setSectionColumns] = useState<{ [sectionId: string]: Column[] }>({});
  // Controlled open states for sections (persist during re-renders)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all sections (including rows and their children)
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .is('page_id', null)
        .eq('is_active', true)
        .order('position');
      
      if (sectionsError) throw sectionsError;
      
      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('cms_items')
        .select('*')
        .is('page_id', null)
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
      
      // Initialize history
      if (convertedSections && convertedItems) {
        setHistory([{ sections: convertedSections, items: convertedItems }]);
        setHistoryIndex(0);
        initializeColumns(convertedSections, convertedItems);
      }

      // Safety: ensure no rows are nested inside rows
      await fixNestedRows(convertedSections);

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
        // Build payload for edge function
        const sectionsPayload = newSections.map((s, index) => ({ id: s.id, position: index }));

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
    setActiveId(event.active.id as string);
  }, []);

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
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log('Drag end:', { activeId, overId, overData: (over as any).data?.current });

    // Check if dragging a section
    const draggedSection = sections.find(s => s.id === activeId);
    if (draggedSection) {
      const overData = (over as any).data?.current;
      
        // Dropping section into a row (specific column or anywhere on row)
        if (overData?.type === 'row-column' || overData?.type === 'row-container') {
          // Prevent nesting rows inside rows - only block when dropping INTO a row
          if (draggedSection.section_type === 'row') {
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

      // Regular section reordering (top-level sections only)
      const topLevelSections = sections.filter(s => !s.parent_id);
      const oldIndex = topLevelSections.findIndex(s => s.id === activeId);
      const newIndex = topLevelSections.findIndex(s => s.id === overId);
      
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
          const allOtherSections = sections.filter(s => s.parent_id);
          const newSections = [...reorderedTopLevel, ...allOtherSections];
          saveToHistory(newSections, items);
          setSections(newSections);
          setHasUnsavedChanges(true);
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
    autoSave(sections, newItems);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setSections(prevState.sections);
      setItems(prevState.items);
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
      autoSave(prevState.sections, prevState.items);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSections(nextState.sections);
      setItems(nextState.items);
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);
      autoSave(nextState.sections, nextState.items);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build payload for edge function
      const sectionsPayload = sections.map((s, index) => ({ id: s.id, position: index }));

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
      const isSection = sections.find(s => s.id === elementId);
      
      if (isSection) {
        // Determine width_type and height_type based on values
        const width_type = width > 0 ? 'custom' : 'full';
        const height_type = height > 0 ? 'custom' : 'auto';
        
        console.log(`Updating section ${elementId} with width_type: ${width_type}, height_type: ${height_type}, custom_width: ${width > 0 ? width : null}, custom_height: ${height > 0 ? height : null}`);
        
        // Update section size in database
        const { error } = await supabase
          .from('cms_sections')
          .update({ 
            custom_width: width > 0 ? width : null, 
            custom_height: height > 0 ? height : null,
            width_type,
            height_type,
            updated_at: new Date().toISOString()
          })
          .eq('id', elementId);
        
        if (error) throw error;
        
        // Update local state
        setSections(prev => prev.map(s => 
          s.id === elementId 
            ? { 
                ...s, 
                custom_width: width > 0 ? width : null, 
                custom_height: height > 0 ? height : null,
                width_type,
                height_type
              }
            : s
        ));
        
        toast({
          title: 'Sukces',
          description: 'Rozmiar sekcji został zapisany',
        });
      }
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
    
    autoSave(sections, newItems);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              Layout Editor
            </div>
            {!editMode && (
              <Button onClick={() => setEditMode(true)} className="gap-2">
                <Edit3 className="w-4 h-4" />
                Enable Edit Mode
              </Button>
            )}
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
          />
          
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-background border rounded-lg">
            <DevicePreview
              currentDevice={currentDevice}
              onDeviceChange={setCurrentDevice}
            />
            
            {selectedElement && (
              <ResponsiveControls
                settings={responsiveSettings}
                currentDevice={currentDevice}
                onSettingsChange={setResponsiveSettings}
                className="w-full sm:w-auto"
              />
            )}
          </div>
        </>
      )}

      <InactiveElementsManager
        onElementActivated={fetchData}
        onElementDeleted={fetchData}
      />

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
      />

      <div className={`space-y-6 ${editMode ? 'pb-32' : ''}`}>
        <DeviceFrame device={currentDevice} className="mx-auto">
          <DragDropProvider
            items={[
              ...sections.map(s => s.id),
              ...items.filter(i => i.id).map(i => i.id as string)
            ]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            activeId={activeId}
            dragOverlay={
              activeId ? (
                (() => {
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
                      key={section.id}
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
                          console.log('Attempting to remove row:', rowId);
                          try {
                            // First, check if row has children and move them to top level
                            const childSections = sections.filter(s => s.parent_id === rowId);
                            
                            // Move children to top level first
                            for (const child of childSections) {
                              const { error: childError } = await supabase
                                .from('cms_sections')
                                .update({ 
                                  parent_id: null, 
                                  position: sections.filter(s => !s.parent_id).length,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', child.id);
                              if (childError) {
                                console.error('Error moving child section:', childError);
                                throw childError;
                              }
                            }
                            
                            // Then remove the row
                            const { error } = await supabase
                              .from('cms_sections')
                              .update({ is_active: false, updated_at: new Date().toISOString() })
                              .eq('id', rowId);
                              
                            if (error) {
                              console.error('Database error:', error);
                              throw error;
                            }
                            
                            await fetchData();
                            toast({ title: 'Wiersz usunięty', description: 'Wiersz został usunięty, a sekcje przeniesione na główny poziom' });
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
                      />
                    </DraggableSection>
                  );
                }

                // Render regular sections
                const columns = sectionColumns[section.id] || [{
                  id: `${section.id}-col-0`,
                  items: items.filter(item => item.section_id === section.id),
                  width: 100,
                }];
                
                return (
                  <DraggableSection
                    key={section.id}
                    id={section.id}
                    isEditMode={editMode}
                    className="w-full"
                  >
                    <div 
                      onClick={(e) => {
                        // Ignore clicks during drag operations
                        if (activeId) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        setSelectedElement(section.id);
                      }}
                      className={cn(
                        "cursor-pointer transition-all duration-200 w-full",
                        selectedElement === section.id && "ring-2 ring-blue-400 ring-offset-2"
                      )}
                    >
                      <ResizableElement
                        isEditMode={editMode}
                        onResize={(width, height) => handleElementResize(section.id, width, height)}
                        initialWidth={section.width_type === 'custom' ? section.custom_width || undefined : undefined}
                        initialHeight={section.height_type === 'custom' ? section.custom_height || undefined : undefined}
                        className="w-full"
                      >
                        <CollapsibleSection
                          title={section.title}
                          description={section.description}
                          sectionStyle={{
                            background_color: section.background_color,
                            text_color: section.text_color,
                            font_size: section.font_size,
                            alignment: section.alignment,
                            padding: section.padding,
                            margin: section.margin,
                            border_radius: section.border_radius,
                            style_class: section.style_class,
                            background_gradient: section.background_gradient,
                            border_width: section.border_width,
                            border_color: section.border_color,
                            border_style: section.border_style,
                            box_shadow: section.box_shadow,
                            opacity: section.opacity,
                            width_type: section.width_type,
                            custom_width: section.custom_width,
                            height_type: section.height_type,
                            custom_height: section.custom_height,
                            max_width: section.max_width,
                            font_weight: section.font_weight,
                            line_height: section.line_height,
                            letter_spacing: section.letter_spacing,
                            text_transform: section.text_transform,
                            display_type: section.display_type,
                            justify_content: section.justify_content,
                            align_items: section.align_items,
                            gap: section.gap,
                            section_margin_top: section.section_margin_top,
                            section_margin_bottom: section.section_margin_bottom,
                            background_image: section.background_image,
                            background_image_opacity: section.background_image_opacity,
                            background_image_position: section.background_image_position,
                            background_image_size: section.background_image_size,
                            icon_name: section.icon_name,
                            icon_position: section.icon_position,
                            icon_size: section.icon_size,
                            icon_color: section.icon_color,
                            show_icon: section.show_icon,
                            min_height: section.min_height,
                            hover_opacity: section.hover_opacity,
                            hover_scale: section.hover_scale,
                            hover_transition_duration: section.hover_transition_duration,
                            hover_background_color: section.hover_background_color,
                            hover_background_gradient: section.hover_background_gradient,
                            hover_text_color: section.hover_text_color,
                            hover_border_color: section.hover_border_color,
                            hover_box_shadow: section.hover_box_shadow,
                            content_direction: section.content_direction,
                            content_wrap: section.content_wrap,
                            overflow_behavior: section.overflow_behavior
                          }}
                          nestedItems={[]}
                          defaultOpen={false}
                          disableToggle={!!activeId}
                          isOpen={!!openSections[section.id]}
                          onOpenChange={(o) => setOpenSections((prev) => ({ ...prev, [section.id]: o }))}
                        >
                          <ColumnLayout
                            sectionId={section.id}
                            columns={columns}
                            isEditMode={editMode}
                            onColumnsChange={(newColumns) => handleColumnsChange(section.id, newColumns)}
                            onItemClick={() => {}}
                            onSelectItem={(itemId) => setSelectedElement(itemId)}
                            activeId={activeId}
                          />
                        </CollapsibleSection>
                      </ResizableElement>
                    </div>
                  </DraggableSection>
                );
              })}
            </div>
          </SortableContext>
        </DragDropProvider>
        </DeviceFrame>
      </div>
    </div>
  );
};