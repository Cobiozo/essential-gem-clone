import React, { useState, useEffect, useCallback } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, Loader2 } from 'lucide-react';
import { DragDropProvider } from './DragDropProvider';
import { DraggableSection } from './DraggableSection';
import { DraggableItem } from './DraggableItem';
import { EditingToolbar } from './EditingToolbar';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { CMSContent } from '@/components/CMSContent';
import { CMSSection, CMSItem } from '@/types/cms';

export const LivePreviewEditor: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
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
        // Update section positions
        const sectionUpdates = newSections.map((section, index) => 
          supabase
            .from('cms_sections')
            .update({ position: index })
            .eq('id', section.id)
        );

        // Update item positions
        const itemUpdates = newItems.map((item, index) =>
          supabase
            .from('cms_items')
            .update({ position: index })
            .eq('id', item.id)
        );

        await Promise.all([...sectionUpdates, ...itemUpdates]);
        
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dragging sections
    const isSection = sections.some(s => s.id === activeId);
    
    if (isSection) {
      const oldIndex = sections.findIndex(s => s.id === activeId);
      const newIndex = sections.findIndex(s => s.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(sections, oldIndex, newIndex);
        saveToHistory(newSections, items);
        setSections(newSections);
        setHasUnsavedChanges(true);
        autoSave(newSections, items);
      }
    } else {
      // Dragging items
      const oldIndex = items.findIndex(i => i.id === activeId);
      const newIndex = items.findIndex(i => i.id === overId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        saveToHistory(sections, newItems);
        setItems(newItems);
        setHasUnsavedChanges(true);
        autoSave(sections, newItems);
      }
    }
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
      // Force save current state
      const sectionUpdates = sections.map((section, index) => 
        supabase
          .from('cms_sections')
          .update({ position: index })
          .eq('id', section.id)
      );

      const itemUpdates = items.map((item, index) =>
        supabase
          .from('cms_items')
          .update({ position: index })
          .eq('id', item.id)
      );

      await Promise.all([...sectionUpdates, ...itemUpdates]);
      
      setHasUnsavedChanges(false);
      setAutoSaveStatus('saved');
      toast({
        title: 'Success',
        description: 'Layout saved successfully',
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
      }
    } else {
      setEditMode(false);
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

  const sectionIds = sections.map(s => s.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Layout Editor
            {!editMode && (
              <Button onClick={() => setEditMode(true)} className="gap-2">
                <Edit3 className="w-4 h-4" />
                Enable Edit Mode
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            {editMode 
              ? "Drag and drop sections and items to reorder them. Changes are auto-saved."
              : "Click 'Enable Edit Mode' to start rearranging your page layout."
            }
          </CardDescription>
        </CardHeader>
      </Card>

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

      <div className={`space-y-6 ${editMode ? 'pb-20' : ''}`}>
        <DragDropProvider
          items={sectionIds}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          activeId={activeId}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sections.map((section) => {
              const sectionItems = items.filter(item => item.section_id === section.id);
              
              return (
                <DraggableSection
                  key={section.id}
                  id={section.id}
                  isEditMode={editMode}
                  className="h-fit"
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
                    nestedItems={sectionItems}
                    defaultOpen={true}
                  >
                    <div className="space-y-4">
                      {sectionItems.map((item) => (
                        <DraggableItem
                          key={item.id}
                          id={item.id || ''}
                          isEditMode={editMode}
                        >
                          <CMSContent
                            item={item}
                            onClick={() => {}}
                          />
                        </DraggableItem>
                      ))}
                    </div>
                  </CollapsibleSection>
                </DraggableSection>
              );
            })}
          </div>
        </DragDropProvider>
      </div>
    </div>
  );
};