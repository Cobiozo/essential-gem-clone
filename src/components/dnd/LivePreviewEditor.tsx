import React, { useState, useEffect, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, Loader2, Layout, Columns } from 'lucide-react';
import { DragDropProvider } from './DragDropProvider';
import { DraggableSection } from './DraggableSection';
import { DraggableItem } from './DraggableItem';
import { ResizableElement } from './ResizableElement';
import { ColumnLayout } from './ColumnLayout';
import { EditingToolbar } from './EditingToolbar';
import { LayoutControls } from './LayoutControls';
import { DevicePreview, DeviceFrame, DeviceType } from './DevicePreview';
import { ResponsiveControls, defaultResponsiveSettings } from './ResponsiveControls';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { CMSContent } from '@/components/CMSContent';
import { CMSSection, CMSItem } from '@/types/cms';

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
  
  // History for undo/redo
  const [history, setHistory] = useState<{ sections: CMSSection[], items: CMSItem[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-save functionality
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout>();
  
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
      columnData[section.id] = [{
        id: `${section.id}-col-0`,
        items: sectionItems,
        width: 100,
      }];
    });
    
    setSectionColumns(columnData);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch sections
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
        .eq('is_active', true)
        .order('position');
      
      if (itemsError) throw itemsError;
      
      // Convert database data to proper types
      const convertedSections = sectionsData || [];
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

        const itemsPayload: { id: string; section_id: string; position: number }[] = [];
        Object.entries(itemsBySection).forEach(([sid, arr]) => {
          arr.forEach((it, idx) => {
            itemsPayload.push({ id: it.id as string, section_id: sid, position: idx });
          });
        });

        const { error } = await supabase.functions.invoke('save-cms-layout', {
          body: { sections: sectionsPayload, items: itemsPayload },
        });
        if (error) throw error;

        setAutoSaveStatus('saved');
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
      }
    }, 2000);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Enable dropping into columns
    if (overId.includes('-col-')) {
      // This helps with visual feedback during drag
      console.log(`Dragging ${activeId} over column ${overId}`);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log('Drag end:', { activeId, overId, overData: (over as any).data?.current });

    // If dragging a section, reorder sections
    const isSectionDrag = sections.some(s => s.id === activeId);
    if (isSectionDrag) {
      const oldIndex = sections.findIndex(s => s.id === activeId);
      const newIndex = sections.findIndex(s => s.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(sections, oldIndex, newIndex);
        saveToHistory(newSections, items);
        setSections(newSections);
        setHasUnsavedChanges(true);
        autoSave(newSections, items);
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

    // Update item's section_id
    const updatedItem = {
      ...movedItem,
      section_id: targetSectionId,
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
      cols.forEach(col => {
        newItems.push(...col.items);
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

      const itemsPayload: { id: string; section_id: string; position: number }[] = [];
      Object.entries(itemsBySection).forEach(([sid, arr]) => {
        arr.forEach((it, idx) => {
          itemsPayload.push({ id: it.id as string, section_id: sid, position: idx });
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

  const handleElementResize = (elementId: string, width: number, height: number) => {
    // Here you would save the resize data to the database
    console.log(`Element ${elementId} resized to ${width}x${height}`);
    setHasUnsavedChanges(true);
  };

  const handleLayoutModeChange = (mode: 'single' | 'columns' | 'grid') => {
    setLayoutMode(mode);
    setHasUnsavedChanges(true);
  };

  const handleColumnCountChange = (count: number) => {
    setColumnCount(count);
    setHasUnsavedChanges(true);
  };

  const handleColumnsChange = (sectionId: string, columns: Column[]) => {
    setSectionColumns(prev => ({
      ...prev,
      [sectionId]: columns,
    }));
    
    // Flatten columns back to items array
    const allItemsFromColumns = Object.values(columns).flatMap(col => col.items);
    const otherSectionItems = items.filter(item => item.section_id !== sectionId);
    const newItems = [...otherSectionItems, ...allItemsFromColumns];
    
    setItems(newItems);
    setHasUnsavedChanges(true);
    autoSave(sections, newItems);
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

      <LayoutControls
        isVisible={editMode}
        selectedElement={selectedElement}
        layoutMode={layoutMode}
        columnCount={columnCount}
        onLayoutModeChange={handleLayoutModeChange}
        onColumnCountChange={handleColumnCountChange}
        onDuplicateElement={() => {
          // Handle duplication
          console.log('Duplicate element:', selectedElement);
        }}
        onDeleteElement={() => {
          // Handle deletion
          console.log('Delete element:', selectedElement);
        }}
        onResetElement={() => {
          // Handle reset
          console.log('Reset element:', selectedElement);
        }}
        onElementSettings={() => {
          // Handle settings
          console.log('Element settings:', selectedElement);
        }}
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
                items.find(i => i.id === activeId) ? (
                  <div className="bg-white border-2 border-blue-400 rounded p-2 shadow-lg opacity-80">
                    <CMSContent 
                      item={items.find(i => i.id === activeId)!} 
                      onClick={() => {}} 
                    />
                  </div>
                ) : (
                  sections.find(s => s.id === activeId) ? (
                    <div className="bg-white border-2 border-green-400 rounded p-2 shadow-lg opacity-80">
                      Section: {sections.find(s => s.id === activeId)?.title}
                    </div>
                  ) : null
                )
              ) : null
            }
            disabled={!editMode}
          >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sections.map((section) => {
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
                  className="h-fit"
                >
                  <ResizableElement
                    isEditMode={editMode}
                    onResize={(width, height) => handleElementResize(section.id, width, height)}
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
                      defaultOpen={true}
                    >
                      <ColumnLayout
                        sectionId={section.id}
                        columns={columns}
                        isEditMode={editMode}
                        onColumnsChange={(newColumns) => handleColumnsChange(section.id, newColumns)}
                        onItemClick={() => {}}
                      />
                    </CollapsibleSection>
                  </ResizableElement>
                </DraggableSection>
              );
            })}
          </div>
        </DragDropProvider>
        </DeviceFrame>
      </div>
    </div>
  );
};