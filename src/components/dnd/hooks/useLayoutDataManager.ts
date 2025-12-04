import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CMSSection, CMSItem } from '@/types/cms';
import { convertSupabaseSections } from '@/lib/typeUtils';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
}

interface UseLayoutDataManagerProps {
  pageId: string;
  isAdmin: boolean;
}

export const useLayoutDataManager = ({ pageId, isAdmin }: UseLayoutDataManagerProps) => {
  const { toast } = useToast();
  
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [layoutMode, setLayoutMode] = useState<'single' | 'columns' | 'grid'>('single');
  const [columnCount, setColumnCount] = useState(2);
  const [sectionColumns, setSectionColumns] = useState<{ [sectionId: string]: Column[] }>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  // History for undo/redo
  const [history, setHistory] = useState<{ sections: CMSSection[], items: CMSItem[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const hasFixedNestedRowsRef = useRef(false);
  const hasFixedMissingPageIdRef = useRef(false);
  const hasRepairedInvisibleRef = useRef(false);

  const saveToHistory = useCallback((newSections: CMSSection[], newItems: CMSItem[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ sections: newSections, items: newItems });
      return newHistory.slice(-20);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const initializeColumns = useCallback((sections: CMSSection[], items: CMSItem[]) => {
    const columnData: { [sectionId: string]: Column[] } = {};
    
    sections.forEach(section => {
      const sectionItems = items.filter(item => item.section_id === section.id);
      const savedColumnCount = section.style_class?.match(/columns-(\d+)/)?.[1];
      const derivedFromItems = sectionItems.reduce((max, it: any) => {
        const ci = typeof it.column_index === 'number' ? it.column_index : 0;
        return Math.max(max, ci);
      }, 0) + 1;
      const colCount = savedColumnCount ? parseInt(savedColumnCount, 10) : Math.max(1, derivedFromItems);
      
      const columns: Column[] = Array.from({ length: Math.max(1, colCount) }, (_, i) => ({
        id: `${section.id}-col-${i}`,
        items: [],
        width: 100 / Math.max(1, colCount),
      }));
      
      sectionItems.forEach((it: any) => {
        const idx = Math.min(columns.length - 1, Math.max(0, typeof it.column_index === 'number' ? it.column_index : 0));
        columns[idx].items.push(it);
      });
      
      columnData[section.id] = columns;
    });
    
    setSectionColumns(columnData);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageId)
        .eq('is_active', true)
        .order('position');
      
      if (sectionsError) throw sectionsError;
      
      const { data: itemsData, error: itemsError } = await supabase
        .from('cms_items')
        .select('*')
        .eq('page_id', pageId)
        .eq('is_active', true)
        .order('position');
      
      if (itemsError) throw itemsError;
      
      const convertedSections = convertSupabaseSections(sectionsData || []);
      const convertedItems = (itemsData || []).map((item: any) => ({
        ...item,
        cells: item.cells ? (Array.isArray(item.cells) ? item.cells : JSON.parse(item.cells)) : []
      }));
      
      setSections(convertedSections);
      setItems(convertedItems);

      const initialOpenSections: Record<string, boolean> = {};
      convertedSections.forEach(section => {
        initialOpenSections[section.id] = section.section_type === 'section' && !section.parent_id 
          ? true 
          : (section.default_expanded || false);
      });
      setOpenSections(initialOpenSections);

      if (convertedSections && convertedItems) {
        setHistory([{ sections: convertedSections, items: convertedItems }]);
        setHistoryIndex(0);
        initializeColumns(convertedSections, convertedItems);
      }

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
  }, [pageId, toast, initializeColumns]);

  const autoSave = useCallback(async (newSections: CMSSection[], newItems: CMSItem[]) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        const sectionsPayload = newSections.map((s) => ({
          id: s.id,
          position: s.position,
          width_type: s.width_type,
          height_type: s.height_type,
          custom_width: s.custom_width ?? null,
          custom_height: s.custom_height ?? null,
          row_layout_type: (s as any).row_layout_type ?? null
        }));

        const itemsBySection: { [key: string]: CMSItem[] } = {};
        newItems.forEach((it) => {
          const sid = (it.section_id as string) || '';
          if (!sid) return;
          if (!itemsBySection[sid]) itemsBySection[sid] = [];
          itemsBySection[sid].push(it);
        });

        const itemsPayload: { id: string; section_id: string; position: number; column_index?: number }[] = [];
        Object.entries(itemsBySection).forEach(([sid, arr]) => {
          arr.forEach((it: any, idx) => {
            itemsPayload.push({
              id: it.id as string,
              section_id: sid,
              position: idx,
              column_index: typeof it.column_index === 'number' ? it.column_index : 0
            });
          });
        });

        const { data, error } = await supabase.functions.invoke('save-cms-layout', {
          body: { sections: sectionsPayload, items: itemsPayload },
        });
        
        if (error) throw error;
        if (!data?.ok) throw new Error('Auto-save did not complete successfully');

        setAutoSaveStatus('saved');
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
      }
    }, 2000);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      const sectionsPayload = sections.map((s) => ({
        id: s.id,
        position: s.position,
        width_type: s.width_type,
        height_type: s.height_type,
        custom_width: s.custom_width ?? null,
        custom_height: s.custom_height ?? null,
        row_layout_type: (s as any).row_layout_type ?? null
      }));

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
          itemsPayload.push({
            id: it.id as string,
            section_id: sid,
            position: idx,
            column_index: typeof it.column_index === 'number' ? it.column_index : 0
          });
        });
      });

      const { data, error } = await supabase.functions.invoke('save-cms-layout', {
        body: { sections: sectionsPayload, items: itemsPayload },
      });
      
      if (error) throw error;
      if (!data?.ok) throw new Error('Save failed');

      setHasUnsavedChanges(false);
      setAutoSaveStatus('saved');
      
      toast({
        title: 'Sukces',
        description: 'Układ strony został zapisany',
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
  }, [sections, items, toast]);

  const savePageSettings = useCallback(async (mode: 'single' | 'columns' | 'grid', count: number) => {
    try {
      const { error } = await supabase
        .from('page_settings')
        .upsert(
          { page_type: 'homepage', layout_mode: mode, column_count: count, updated_at: new Date().toISOString() },
          { onConflict: 'page_type' }
        );
      if (error) throw error;

      toast({ title: 'Zapisano', description: 'Ustawienia układu strony zapisane' });
    } catch (e) {
      console.error('savePageSettings error', e);
      toast({ title: 'Błąd', description: 'Nie udało się zapisać ustawień układu', variant: 'destructive' });
    }
  }, [toast]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setSections(prevState.sections);
      setItems(prevState.items);
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSections(nextState.sections);
      setItems(nextState.items);
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  const handleLayoutModeChange = useCallback((mode: 'single' | 'columns' | 'grid') => {
    setLayoutMode(mode);
    setHasUnsavedChanges(true);
    savePageSettings(mode, columnCount);
  }, [columnCount, savePageSettings]);

  const handleColumnCountChange = useCallback((count: number) => {
    setColumnCount(count);
    setHasUnsavedChanges(true);
    savePageSettings(layoutMode, count);
  }, [layoutMode, savePageSettings]);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`cms-items-changes-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_items',
          filter: `page_id=eq.${pageId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as any;
            if (updatedItem.is_active === false) {
              setItems(prev => prev.filter(i => i.id !== updatedItem.id));
            } else {
              setItems(prev => prev.map(i => 
                i.id === updatedItem.id 
                  ? { ...updatedItem, cells: Array.isArray(updatedItem.cells) ? updatedItem.cells : JSON.parse(updatedItem.cells || '[]') }
                  : i
              ));
            }
          } else if (payload.eventType === 'INSERT') {
            const newItem = payload.new as any;
            if (newItem.is_active) {
              setItems(prev => {
                if (prev.some(i => i.id === newItem.id)) return prev;
                return [...prev, { 
                  ...newItem, 
                  cells: Array.isArray(newItem.cells) ? newItem.cells : JSON.parse(newItem.cells || '[]') 
                }];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId]);

  return {
    // State
    sections,
    items,
    loading,
    isSaving,
    hasUnsavedChanges,
    autoSaveStatus,
    layoutMode,
    columnCount,
    sectionColumns,
    openSections,
    history,
    historyIndex,
    
    // Setters
    setSections,
    setItems,
    setHasUnsavedChanges,
    setAutoSaveStatus,
    setSectionColumns,
    setOpenSections,
    
    // Actions
    fetchData,
    autoSave,
    handleSave,
    handleUndo,
    handleRedo,
    handleLayoutModeChange,
    handleColumnCountChange,
    saveToHistory,
    initializeColumns,
    
    // Computed
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};
