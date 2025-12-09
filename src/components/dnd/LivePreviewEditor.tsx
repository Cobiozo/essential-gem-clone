import React, { useState, useEffect, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, Loader2, Layout, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropProvider } from './DragDropProvider';
import { DraggableSection } from './DraggableSection';
import { convertSupabaseSections, convertSupabaseSection } from '@/lib/typeUtils';
import { SimpleRowDemo } from './SimpleRowDemo';
import { DraggableItem } from './DraggableItem';
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
import { ItemControls } from './ItemControls';
import { ItemEditor } from '@/components/cms/ItemEditor';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLayoutDataManager } from './hooks/useLayoutDataManager';
import { useItemManager } from './hooks/useItemManager';
import { useSectionManager } from './hooks/useSectionManager';
import { SectionRenderer } from './SectionRenderer';
import { createDefaultContent, getElementTypeName, initializeSectionColumns, log, warn } from './utils/layoutHelpers';

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
}

interface LivePreviewEditorProps {
  pageId?: string;
  pageTitle?: string;
  onClose?: () => void;
}

export const LivePreviewEditor: React.FC<LivePreviewEditorProps> = ({ 
  pageId = '8f3009d3-3167-423f-8382-3eab1dce8cb1', 
  pageTitle = 'Strona główna',
  onClose 
}) => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Use centralized data manager hook
  const dataManager = useLayoutDataManager({ pageId, isAdmin });
  const {
    sections, items, loading, isSaving, hasUnsavedChanges, autoSaveStatus,
    layoutMode, columnCount, sectionColumns, openSections, history, historyIndex,
    setSections, setItems, setHasUnsavedChanges, setSectionColumns, setOpenSections,
    fetchData, autoSave, handleSave, handleUndo, handleRedo,
    handleLayoutModeChange, handleColumnCountChange, saveToHistory, initializeColumns,
    canUndo, canRedo,
  } = dataManager;

  // Use item manager hook
  const itemManager = useItemManager({
    pageId,
    items,
    sections,
    setItems,
    saveToHistory,
    setHasUnsavedChanges,
    fetchData,
  });
  const {
    editingItemId, isItemEditorOpen, setEditingItemId, setIsItemEditorOpen,
    handleEditItem, handleSaveItem, handleDeleteItem, handleDuplicateItem,
    handleMoveItemUp, handleMoveItemDown, closeItemEditor,
  } = itemManager;

  // Use section manager hook
  const sectionManager = useSectionManager({
    pageId,
    sections,
    items,
    setSections,
    saveToHistory,
    setHasUnsavedChanges,
  });
  const {
    editingSectionId, isSectionEditorOpen, setEditingSectionId, setIsSectionEditorOpen,
    handleEditSection, handleSaveSection, handleDuplicateSection, handleDeactivateSection,
    handleResetSection, handleAlignSection, handleSizeSection, closeSectionEditor,
  } = sectionManager;
  
  // Local UI state
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [currentDevice, setCurrentDevice] = useState<DeviceType>('desktop');
  const [responsiveSettings, setResponsiveSettings] = useState(defaultResponsiveSettings);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'elements' | 'properties'>('elements');
  const [selectedElementForPanel, setSelectedElementForPanel] = useState<string | null>(null);
  const [dragVersion, setDragVersion] = useState(0);
  const [inactiveRefresh, setInactiveRefresh] = useState(0);
  const [copiedElement, setCopiedElement] = useState<{ type: 'section' | 'item'; data: any } | null>(null);

  // Keyboard shortcuts integration
  useKeyboardShortcuts({
    enabled: editMode,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: () => {
      if (selectedElement) {
        handleDeactivateElement(selectedElement);
      }
    },
    onDuplicate: () => {
      if (selectedElement) {
        handleDuplicateElement();
      }
    },
    onDeselect: () => {
      setSelectedElement(null);
      setPanelMode('elements');
    },
    onSave: handleSave,
    onCopy: () => {
      if (selectedElement) {
        const section = sections.find(s => s.id === selectedElement);
        const item = items.find(i => i.id === selectedElement);
        if (section) {
          setCopiedElement({ type: 'section', data: section });
          toast({ title: 'Skopiowano', description: 'Sekcja skopiowana do schowka' });
        } else if (item) {
          setCopiedElement({ type: 'item', data: item });
          toast({ title: 'Skopiowano', description: 'Element skopiowany do schowka' });
        }
      }
    },
    onPaste: () => {
      if (copiedElement) {
        toast({ title: 'Info', description: 'Użyj przycisku duplikuj aby skopiować element' });
      }
    },
    onMoveUp: () => {
      if (selectedElement && items.find(i => i.id === selectedElement)) {
        handleMoveItemUp(selectedElement);
      }
    },
    onMoveDown: () => {
      if (selectedElement && items.find(i => i.id === selectedElement)) {
        handleMoveItemDown(selectedElement);
      }
    },
    onToggleEditMode: () => {
      if (!editMode) {
        setEditMode(true);
      } else {
        handleCancel();
      }
    },
    canUndo,
    canRedo,
    selectedElement,
  });

  // Repair refs for one-time fixes
  const hasFixedNestedRowsRef = React.useRef(false);
  const hasFixedMissingPageIdRef = React.useRef(false);
  const hasRepairedInvisibleRef = React.useRef(false);

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
      setSections(prev => prev.map(s => ids.includes(s.id) ? { ...s, parent_id: null } : s));
      toast({ title: 'Naprawiono układ', description: 'Zagnieżdżone wiersze przeniesiono na poziom główny' });
    } catch (e) {
      console.error('fixNestedRows error', e);
    }
  };

  // Fix sections without page_id
  const fixMissingPageId = async () => {
    if (hasFixedMissingPageIdRef.current) return;
    if (!isAdmin) return;
    try {
      const { data: orphanSections } = await supabase
        .from('cms_sections')
        .select('id, title')
        .is('page_id', null)
        .eq('is_active', true);
      
      if (!orphanSections || orphanSections.length === 0) return;
      
      const { error } = await supabase
        .from('cms_sections')
        .update({ page_id: pageId, updated_at: new Date().toISOString() })
        .is('page_id', null)
        .eq('is_active', true);
      
      if (error) throw error;
      hasFixedMissingPageIdRef.current = true;
      toast({ title: 'Naprawiono', description: `Przypisano ${orphanSections.length} sekcji do strony` });
      await fetchData();
    } catch (e) {
      console.error('fixMissingPageId error', e);
    }
  };

  // Run one-time repairs on load
  useEffect(() => {
    if (sections.length > 0) {
      fixNestedRows(sections);
      fixMissingPageId();
    }
  }, [sections.length]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [pageId]);


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
    const draggedId = event.active.id as string;
    console.log('[DragStart] Element ID:', draggedId);
    console.log('[DragStart] Element data:', event.active.data.current);
    setActiveId(draggedId);
  }, []);

  const createDefaultContent = (elementType: string) => {
    console.log('[createDefaultContent] Creating content for type:', elementType);
    
    // ❌ WAŻNE: NIE używaj type='section' w cells - to powoduje renderowanie CollapsibleSection
    switch (elementType) {
      case 'heading':
        return [{ type: 'h2', content: 'Nowy nagłówek', level: 2 }];
      case 'text':
        return [{ type: 'paragraph', content: 'Nowy tekst' }];
      case 'image':
        return [{ type: 'img', content: '', alt: 'Obrazek' }];
      case 'video':
        return [{ type: 'video_embed', content: '', title: 'Film' }];
      case 'button':
        return [{ type: 'btn', content: 'Kliknij', url: '#' }];
      case 'divider':
        return [{ type: 'hr' }];
      case 'spacer':
        return [{ type: 'space', height: 40 }];
      case 'maps':
        return [{ type: 'google_maps', content: '', title: 'Mapa' }];
      case 'icon':
        return [{ type: 'lucide_icon', content: 'Star' }];
      
      case 'info_text':
        return [{ type: 'info_text', content: 'Nowy tekst informacyjny' }];
      
      // Layout elements - nie powinny być używane tutaj, ale dla bezpieczeństwa
      case 'container':
        console.warn('[createDefaultContent] WARNING: container should create section, not item');
        return [{ type: 'container', content: 'BŁĄD: To powinno być sekcją' }];
      case 'grid':
        console.warn('[createDefaultContent] WARNING: grid should create section, not item');
        return [{ type: 'grid', content: 'BŁĄD: To powinno być sekcją' }];
      case 'pure-life-container':
        console.warn('[createDefaultContent] WARNING: pure-life-container should create section, not item');
        return [{ type: 'pure-life-container', content: 'BŁĄD: To powinno być sekcją' }];
      
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
      info_text: 'Tekst informacyjny',
      divider: 'Rozdzielacz',
      spacer: 'Odstęp',
      maps: 'Mapa',
      icon: 'Ikonka',
      container: 'Kontener',
      grid: 'Siatka',
      'pure-life-container': 'Pure Life',
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

  const handleNewElementDrop = async (elementType: string, targetId: string) => {
    console.log('[handleNewElementDrop] Element type:', elementType, 'Target:', targetId);
    
    try {
      // Check if this is a layout element that should create a section
      const layoutElements = ['container', 'grid', 'pure-life-container'];
      
    if (layoutElements.includes(elementType)) {
      console.log('[handleNewElementDrop] Creating layout section for:', elementType);
      
      let insertPosition = 0;
      let insertAfterSectionId: string | null = null;
      
      // 1. Normalizacja i analiza targetId
      let normalizedTargetId = targetId;
      
      // Obsługa różnych formatów targetId:
      if (targetId.startsWith('row-')) {
        // Format: "row-{sectionId}" lub "row-{sectionId}-col-{index}"
        if (targetId.includes('-col-')) {
          // Dropowano na kolumnę w wierszu - wstaw PO tym wierszu
          normalizedTargetId = targetId.split('-col-')[0].replace('row-', '');
        } else {
          // Dropowano na wiersz - wstaw PO tym wierszu
          normalizedTargetId = targetId.replace('row-', '');
        }
        insertAfterSectionId = normalizedTargetId;
      } else if (targetId.includes('-col-')) {
        // Format: "{sectionId}-col-{index}" - sekcja w kolumnie wiersza
        const parentSectionId = targetId.split('-col-')[0];
        const parentSection = sections.find(s => s.id === parentSectionId);
        if (parentSection?.parent_id) {
          // To jest sekcja wewnątrz wiersza - wstaw PO wierszu rodzica
          insertAfterSectionId = parentSection.parent_id;
        } else {
          // To jest zwykła sekcja - wstaw PO niej
          insertAfterSectionId = parentSectionId;
        }
      } else {
        // Format: "{sectionId}" - zwykła sekcja
        insertAfterSectionId = normalizedTargetId;
      }
      
      // 2. Znajdź pozycję wstawienia
      if (insertAfterSectionId) {
        const targetSection = sections.find(s => s.id === insertAfterSectionId);
        
        if (targetSection) {
          const topLevelSections = sections
            .filter(s => !s.parent_id)
            .sort((a, b) => a.position - b.position);
          const targetIndex = topLevelSections.findIndex(s => s.id === targetSection.id);
          
          // ✅ POPRAWKA: Wstaw PO znalezionej sekcji
          // Jeśli to pierwsza sekcja (index 0), możemy wstawić przed nią lub po
          // Domyślnie wstawiamy PO sekcji
          insertPosition = targetIndex >= 0 ? targetIndex + 1 : topLevelSections.length;
          
          console.log('[handleNewElementDrop] 🎯 Inserting AFTER section:', {
            targetId,
            targetTitle: targetSection.title,
            targetPosition: targetSection.position,
            targetIndex,
            newInsertPosition: insertPosition,
            totalTopLevel: topLevelSections.length
          });
        } else {
          // Nie znaleziono sekcji - wstaw na końcu
          insertPosition = sections.filter(s => !s.parent_id).length;
          console.warn('[handleNewElementDrop] ⚠️ Target section not found, adding at end:', insertPosition);
        }
      } else {
        // Brak celu - wstaw na końcu
        insertPosition = sections.filter(s => !s.parent_id).length;
        console.warn('[handleNewElementDrop] ⚠️ No target, adding at end:', insertPosition);
      }
        
        // Determine section type and properties based on element type
        let sectionType: 'row' | 'section' = 'row'; // Both should be rows now
        let rowColumnCount = 1;
        let rowLayoutType: 'equal' | 'custom' = 'equal';
        let displayType: string | null = null;
        let sectionTitle = 'Nowa sekcja';
        
        if (elementType === 'container') {
          // Container = simple row with 1 column
          rowColumnCount = 1;
          rowLayoutType = 'equal';
          sectionTitle = 'Nowy kontener';
        } else if (elementType === 'grid') {
          // Grid = row with multiple columns (default 3)
          rowColumnCount = 3;
          rowLayoutType = 'equal';
          sectionTitle = 'Nowa siatka';
        } else if (elementType === 'pure-life-container') {
          // Pure Life Container = grid display type with 3 columns for info_text elements
          rowColumnCount = 3;
          rowLayoutType = 'equal';
          displayType = 'grid';
          sectionTitle = 'Pure Life';
        }
        
        console.log('[handleNewElementDrop] Creating row at position:', insertPosition, 'with columns:', rowColumnCount);
        
        const { data: newSectionData, error: sectionError } = await supabase
          .from('cms_sections')
          .insert([{
            page_id: pageId,
            section_type: sectionType,
            row_column_count: rowColumnCount,
            row_layout_type: rowLayoutType,
            position: insertPosition,
            parent_id: null,
            is_active: true,
            title: sectionTitle,
            display_type: displayType,
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
      
      console.log('[handleNewElementDrop] 🎯 Analyzing targetId:', targetId);
      console.log('[handleNewElementDrop] All sections:', sections.map(s => ({ id: s.id, type: s.section_type, parent: s.parent_id })));
      
      if (targetId.includes('-col-')) {
        // Format: "{rowOrSectionId}-col-{index}"
        const match = targetId.match(/^(.+)-col-(\d+)$/);
        console.log('[handleNewElementDrop] 🔍 Regex match result:', match);
        
        if (match) {
          const possibleId = match[1];
          columnIndex = parseInt(match[2], 10);
          console.log('[handleNewElementDrop] 📍 Parsed ID:', possibleId, 'Column:', columnIndex);
          
          // ✅ Sprawdź czy to row czy section
          const possibleRow = sections.find(s => s.id === possibleId && s.section_type === 'row');
          console.log('[handleNewElementDrop] 🔎 Looking for row with ID:', possibleId);
          console.log('[handleNewElementDrop] 🔎 Found row?', !!possibleRow, possibleRow?.id);
          
          if (possibleRow) {
            // ✅ To jest row - dodaj element BEZPOŚREDNIO do row, bez tworzenia sekcji
            targetSectionId = possibleId; // Row ID jako section_id
            console.log('[handleNewElementDrop] ✅ CONFIRMED: Dropping into ROW', { rowId: possibleId, columnIndex });
            console.log('[handleNewElementDrop] ✅ Dropped directly into ROW column:', { rowId: possibleId, columnIndex });
          } else {
            // Regular section column
            targetSectionId = possibleId;
            console.log('[handleNewElementDrop] ✅ Dropped into section column:', { targetSectionId, columnIndex });
          }
        } else {
          toast({ title: 'Błąd', description: 'Nieprawidłowy cel', variant: 'destructive' });
          return;
        }
      } else if (targetId.startsWith('row-')) {
        // ✅ Dropped directly onto a row - add element DIRECTLY to row
        const rowId = targetId.replace('row-', '');
        const rowSection = sections.find(s => s.id === rowId && s.section_type === 'row');
        
        if (!rowSection) {
          toast({ title: 'Błąd', description: 'Nie znaleziono wiersza', variant: 'destructive' });
          return;
        }
        
        // ✅ Dodaj element bezpośrednio do row bez tworzenia sekcji
        targetSectionId = rowId;
        columnIndex = 0;
        console.log('[handleNewElementDrop] ✅ Dropping directly into row:', targetSectionId);
      } else {
        // Format: "{sectionId}" - Dropped directly into a section (no column)
        // This is the most common case for regular sections
        targetSectionId = targetId;
        columnIndex = 0;
        console.log('[handleNewElementDrop] ✅ Dropped directly into section:', { targetSectionId, columnIndex });
      }

      // Validate targetSectionId exists (no need to find in array if just created)
      if (!targetSectionId) {
        console.error('[handleNewElementDrop] targetSectionId is undefined');
        toast({ title: 'Błąd', description: 'Nie znaleziono sekcji docelowej', variant: 'destructive' });
        return;
      }
      
      console.log('[handleNewElementDrop] Using target section:', targetSectionId);

      // Get existing items in target section/column
      const existingItems = items.filter(it => 
        it.section_id === targetSectionId && 
        (it as any).column_index === columnIndex
      );
      const newPosition = existingItems.length;

      // Create default content based on element type
      const defaultContent = createDefaultContent(elementType);

      console.log('[handleNewElementDrop] Creating item:', {
        elementType,
        targetSectionId,
        columnIndex,
        position: newPosition,
        defaultContent
      });

      // Create new item in database - using correct field names
      const { data: newItemData, error: insertError } = await supabase
        .from('cms_items')
        .insert([{
          section_id: targetSectionId,
          page_id: pageId,
          type: elementType,
          position: newPosition,
          column_index: columnIndex,
          is_active: true,
          cells: defaultContent as any,
          // ✅ Dodaj domyślne wartości dla info_text
          ...(elementType === 'info_text' && {
            icon: 'Star',
            title: 'Nowy tytuł',
            description: 'Nowy opis',
            url: ''
          })
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[handleNewElementDrop] Insert error:', insertError);
        throw insertError;
      }
      
      console.log('[handleNewElementDrop] Item created:', newItemData);

      // Update local state - NO fetchData()
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
      setItems(newItems);
      saveToHistory(sections, newItems);
      setHasUnsavedChanges(true);

      // Reinitialize columns for live update
      initializeColumns(sections, newItems);
      
      // Force re-render by incrementing drag version
      setDragVersion(v => v + 1);
      
      console.log('[handleNewElementDrop] Local state updated - no page refresh');
      
      // Automatically open ItemEditor for new element
      setEditingItemId(newItemData.id);
      setIsItemEditorOpen(true);

      toast({ 
        title: '✅ Element dodany', 
        description: `Skonfiguruj teraz element: ${getElementTypeName(elementType)}` 
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
    if (activeData?.type === 'new-element') {
      console.log('[DragEnd] Dropping new element:', activeData.elementType);
      await handleNewElementDrop(activeData.elementType, over.id as string);
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
          
          // ✅ REMOVED: await fetchData(); - Live updates
          
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
            // ✅ REMOVED: await fetchData(); - Live updates
            // Optimistic update
            setSections(prev => prev.map(s => 
              s.id === activeId ? { ...s, parent_id: null, position: newIndex } : s
            ));
            
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
    // Handle dropping items on row columns
    if (overData?.type === 'row-column') {
      targetSectionId = overData.sectionId;
      targetColIndex = overData.columnIndex ?? 0;
      console.log('Dropping on row-column:', { targetSectionId, targetColIndex });
    } else if (overData?.type === 'row-container') {
      // For row container, treat as dropping in first column of that row
      targetSectionId = overData.sectionId;
      targetColIndex = 0;
      console.log('Dropping on row-container:', { targetSectionId, targetColIndex });
    } else if (overData?.type === 'column') {
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

    console.log('[DragEnd] Moving item:', { 
      id: movedItem.id, 
      type: movedItem.type,
      icon: movedItem.icon,
      title: movedItem.title,
      description: movedItem.description,
      url: movedItem.url,
      allFields: Object.keys(movedItem)
    });

    // Update item's section_id and column_index - PRESERVE ALL FIELDS
    const updatedItem: any = {
      ...movedItem,
      section_id: targetSectionId,
      column_index: targetColIndex,
    };
    
    console.log('[DragEnd] Updated item:', {
      id: updatedItem.id,
      type: updatedItem.type,
      icon: updatedItem.icon,
      title: updatedItem.title,
      description: updatedItem.description,
      url: updatedItem.url
    });

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

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        fetchData();
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
      const section = sections.find(s => s.id === elementId);
      
      if (section) {
        let width_type = section.width_type || 'full';
        let newCustomWidth = section.custom_width;
        
        if (Number.isFinite(width) && width > 0) {
          width_type = 'custom';
          newCustomWidth = Math.round(width);
        } else if (width === 0) {
          width_type = 'full';
          newCustomWidth = null;
        }

        let height_type = section.height_type || 'auto';
        let newCustomHeight = section.custom_height;
        
        if (Number.isFinite(height) && height > 0) {
          height_type = 'custom';
          newCustomHeight = Math.round(height);
        } else if (height === 0) {
          height_type = 'auto';
          newCustomHeight = null;
        }

        setSections(prev => {
          const updated = prev.map(s => 
            s.id === elementId 
              ? { ...s, width_type, height_type, custom_width: newCustomWidth, custom_height: newCustomHeight }
              : s
          ).map(s => {
            if (section.parent_id && s.id === section.parent_id && s.section_type === 'row' && s.row_layout_type !== 'custom') {
              return { ...s, row_layout_type: 'custom' } as any;
            }
            return s;
          });
          autoSave(updated, items);
          return updated;
        });

        try {
          const updates: any = { width_type, height_type, custom_width: newCustomWidth, custom_height: newCustomHeight, updated_at: new Date().toISOString() };
          await supabase.from('cms_sections').update(updates).eq('id', elementId);
        } catch (e) {
          console.error('Immediate resize save failed', e);
        }

        if (section.parent_id) {
          const parentRow = sections.find(s => s.id === section.parent_id && s.section_type === 'row');
          if (parentRow && parentRow.row_layout_type !== 'custom') {
            try {
              await supabase.from('cms_sections').update({ row_layout_type: 'custom', updated_at: new Date().toISOString() }).eq('id', parentRow.id);
            } catch (e) {
              console.error('Parent row layout switch failed', e);
            }
          }
        }
      }
      toast({ title: 'Sukces', description: 'Rozmiar sekcji został zapisany' });
    } catch (error) {
      console.error('Error saving element resize:', error);
      toast({ title: 'Błąd', description: 'Nie można zapisać rozmiaru elementu', variant: 'destructive' });
    }
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
            page_id: pageId,
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
            page_id: pageId,
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
    const isItem = items.find(i => i.id === selectedElement);
    
    if (isSection) {
      try {
        const { error } = await supabase
          .from('cms_sections')
          .update({ 
            custom_width: null,
            custom_height: null,
            width_type: 'full',
            height_type: 'auto',
            alignment: null,
            justify_content: null,
            align_items: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedElement);
        
        if (error) throw error;
        
        setSections(prev => prev.map(s => 
          s.id === selectedElement 
            ? { ...s, custom_width: null, custom_height: null, width_type: 'full', height_type: 'auto', alignment: null, justify_content: null, align_items: null }
            : s
        ));
        
        toast({
          title: 'Sukces',
          description: 'Styl sekcji został zresetowany',
        });
      } catch (error) {
        console.error('Error resetting section:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zresetować stylu sekcji',
          variant: 'destructive',
        });
      }
    } else if (isItem) {
      try {
        const { error } = await supabase
          .from('cms_items')
          .update({ 
            width: null,
            text_align: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedElement);
        
        if (error) throw error;
        
        setItems(prev => prev.map(i => 
          i.id === selectedElement 
            ? { ...i, width: null, text_align: null }
            : i
        ));
        
        toast({
          title: 'Sukces',
          description: 'Styl elementu został zresetowany',
        });
      } catch (error) {
        console.error('Error resetting item:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zresetować stylu elementu',
          variant: 'destructive',
        });
      }
    }
  };

  const handleElementSettings = () => {
    if (!selectedElement) return;
    
    const isSection = sections.find(s => s.id === selectedElement);
    const isItem = items.find(i => i.id === selectedElement);
    
    if (isSection) {
      // Open section editor in sidebar
      setEditingSectionId(selectedElement);
      setIsSectionEditorOpen(true);
      setPanelMode('properties');
      setSelectedElementForPanel(selectedElement);
    } else if (isItem) {
      // Open item editor in sidebar
      handleEditItem(selectedElement);
    }
  };

  const handleAlignElement = async (alignment: 'left' | 'center' | 'right' | 'justify') => {
    if (!selectedElement) return;
    
    const isSection = sections.find(s => s.id === selectedElement);
    const isItem = items.find(i => i.id === selectedElement);
    
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
          description: `Wyrównanie sekcji ustawione na ${alignment}`,
        });
      } catch (error) {
        console.error('Error aligning section:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zmienić wyrównania sekcji',
          variant: 'destructive',
        });
      }
    } else if (isItem) {
      try {
        const alignmentMap: Record<string, string> = {
          left: 'left',
          center: 'center',
          right: 'right',
          justify: 'justify',
        };
        
        const { error } = await supabase
          .from('cms_items')
          .update({ 
            text_align: alignmentMap[alignment],
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedElement);
        
        if (error) throw error;
        
        setItems(prev => prev.map(i => 
          i.id === selectedElement 
            ? { ...i, text_align: alignmentMap[alignment] }
            : i
        ));
        
        toast({
          title: 'Sukces',
          description: `Wyrównanie elementu ustawione na ${alignment}`,
        });
      } catch (error) {
        console.error('Error aligning item:', error);
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
    const isItem = items.find(i => i.id === selectedElement);
    
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
          description: `Rozmiar sekcji: ${sizeType === 'fit' ? 'dopasowany' : 'pełna szerokość'}`,
        });
      } catch (error) {
        console.error('Error sizing section:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zmienić rozmiaru sekcji',
          variant: 'destructive',
        });
      }
    } else if (isItem) {
      try {
        const width_setting = sizeType === 'fit' ? 'auto' : '100%';
        
        const { error } = await supabase
          .from('cms_items')
          .update({ 
            width: width_setting,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedElement);
        
        if (error) throw error;
        
        setItems(prev => prev.map(i => 
          i.id === selectedElement 
            ? { ...i, width: width_setting }
            : i
        ));
        
        toast({
          title: 'Sukces',
          description: `Rozmiar elementu: ${sizeType === 'fit' ? 'dopasowany' : 'pełna szerokość'}`,
        });
      } catch (error) {
        console.error('Error sizing item:', error);
        toast({
          title: 'Błąd',
          description: 'Nie można zmienić rozmiaru elementu',
          variant: 'destructive',
        });
      }
    }
  };

  // Sync selectedElement with editors
  useEffect(() => {
    if (selectedElement) {
      const isSection = sections.find(s => s.id === selectedElement);
      const isItem = items.find(i => i.id === selectedElement);
      
      if (isSection && !isItem) {
        setEditingSectionId(selectedElement);
        setIsSectionEditorOpen(true);
        setPanelMode('properties');
        setSelectedElementForPanel(selectedElement);
        setIsItemEditorOpen(false);
        setEditingItemId(null);
      } else if (isItem) {
        setEditingItemId(selectedElement);
        setIsItemEditorOpen(true);
        setPanelMode('properties');
        setSelectedElementForPanel(selectedElement);
        setIsSectionEditorOpen(false);
        setEditingSectionId(null);
      }
    }
  }, [selectedElement, sections, items, setEditingSectionId, setIsSectionEditorOpen, setEditingItemId, setIsItemEditorOpen]);

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
              {pageTitle}
            </div>
            <div className="flex gap-2">
              {onClose && (
                <Button 
                  onClick={onClose} 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Zamknij
                </Button>
              )}
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
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onTogglePreview={() => setEditMode(!editMode)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        hasUnsavedChanges={hasUnsavedChanges}
        isPreviewMode={!editMode}
        autoSaveStatus={autoSaveStatus}
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
                <ElementsPanel 
                  onElementClick={(type) => {
                    // Don't show toast, just handle drag
                  }}
                  panelMode={panelMode}
                  onPanelModeChange={(mode) => {
                    setPanelMode(mode);
                    if (mode === 'elements') {
                      setSelectedElementForPanel(null);
                      setIsItemEditorOpen(false);
                      setEditingItemId(null);
                      setIsSectionEditorOpen(false);
                      setEditingSectionId(null);
                    }
                  }}
                  editingItemId={editingItemId}
                  editingItem={items.find(i => i.id === editingItemId)}
                  isItemEditorOpen={isItemEditorOpen}
                  onSaveItem={handleSaveItem}
                  onCancelEdit={() => {
                    setIsItemEditorOpen(false);
                    setEditingItemId(null);
                    setPanelMode('elements');
                  }}
                  editingSectionId={editingSectionId}
                  editingSection={sections.find(s => s.id === editingSectionId)}
                  isSectionEditorOpen={isSectionEditorOpen}
                  onSaveSection={handleSaveSection}
                  onCancelSectionEdit={() => {
                    setIsSectionEditorOpen(false);
                    setEditingSectionId(null);
                    setPanelMode('elements');
                  }}
                />
              </div>
            )}
            
          <SortableContext
            items={sections.filter(s => !s.parent_id).map(s => s.id)} 
            strategy={verticalListSortingStrategy}
          >
            {/* Row Containers Demo - visible only in edit mode */}
            {editMode && <SimpleRowDemo pageId={pageId} onRowCreated={fetchData} />}
            
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
              
              // ✅ Optimistic update
              setSections(prev => prev.map(s => 
                s.id === rowId ? { ...s, ...updates } : s
              ));
              setHasUnsavedChanges(true);
            } catch (error) {
              console.error('Error updating row:', error);
            }
          }}
          onUpdateSection={async (sectionId, updates) => {
            try {
              const { error } = await supabase
                .from('cms_sections')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', sectionId);
              if (error) throw error;
              
              // ✅ Optimistic update
              setSections(prev => prev.map(s => 
                s.id === sectionId ? { ...s, ...updates } : s
              ));
              setHasUnsavedChanges(true);
            } catch (error) {
              console.error('Error updating section:', error);
              toast({ 
                title: 'Błąd', 
                description: 'Nie udało się zaktualizować sekcji', 
                variant: 'destructive' 
              });
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
                            
                            // ✅ Optimistic update
                            setSections(prev => prev.filter(s => s.id !== rowId));
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
                        onEditItem={handleEditItem}
                        onDeleteItem={handleDeleteItem}
                        onDuplicateItem={handleDuplicateItem}
                        onMoveItemUp={handleMoveItemUp}
                        onMoveItemDown={handleMoveItemDown}
                        onEditSection={handleEditSection}
                        onDuplicateSection={handleDuplicateSection}
                        onDeactivateSection={handleDeactivateSection}
                        onEditRow={handleEditSection}
                        onDuplicateRow={handleDuplicateSection}
                        onHideRow={handleDeactivateSection}
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
                
                return (
                  <DraggableSection
                    key={section.id}
                    id={section.id}
                    isEditMode={editMode}
                    className="w-full"
                  >
                    <SectionRenderer
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
                      onEditSection={handleEditSection}
                      onDuplicateSection={handleDuplicateSection}
                      onDeactivateSection={handleDeactivateSection}
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

      <InactiveElementsManager
        onElementActivated={() => {
          console.log('Element activated, refreshing layout...');
          fetchData();
        }}
        onElementDeleted={fetchData}
        refreshKey={inactiveRefresh}
      />
      
      {/* Item Editor Dialog - REMOVED, now in sidebar */}
    </div>
  );
};