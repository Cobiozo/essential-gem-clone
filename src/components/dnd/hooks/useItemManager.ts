import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CMSItem, CMSSection } from '@/types/cms';

interface UseItemManagerProps {
  pageId: string;
  items: CMSItem[];
  sections: CMSSection[];
  setItems: React.Dispatch<React.SetStateAction<CMSItem[]>>;
  saveToHistory: (sections: CMSSection[], items: CMSItem[]) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  fetchData: () => Promise<void>;
  onPanelExpand?: () => void;
}

export const useItemManager = ({
  pageId,
  items,
  sections,
  setItems,
  saveToHistory,
  setHasUnsavedChanges,
  fetchData,
  onPanelExpand,
}: UseItemManagerProps) => {
  const { toast } = useToast();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isItemEditorOpen, setIsItemEditorOpen] = useState(false);

  const handleEditItem = useCallback((itemId: string) => {
    console.log('[handleEditItem] Opening editor for item:', itemId);
    
    const item = items.find(i => i.id === itemId);
    if (!item) {
      console.error('[handleEditItem] Item not found:', itemId);
      return;
    }
    
    console.log('[handleEditItem] Item type:', item.type);
    setEditingItemId(itemId);
    setIsItemEditorOpen(true);
    
    // Expand panel and scroll to editor on mobile
    onPanelExpand?.();
  }, [items, onPanelExpand]);

  const handleSaveItem = useCallback(async (updatedItem: Partial<CMSItem>) => {
    if (!editingItemId) return;
    
    console.log('💾 handleSaveItem called with:', updatedItem);
    
    try {
      const originalItem = items.find(i => i.id === editingItemId);
      if (!originalItem) {
        console.error('❌ Original item not found');
        return;
      }
      
      let finalCells = updatedItem.cells || originalItem.cells || [];
      
      // Sync cells with legacy fields
      if ((updatedItem.type === 'heading' || originalItem.type === 'heading') && updatedItem.title !== undefined) {
        const existingCell: any = (Array.isArray(finalCells) && finalCells[0]) ? finalCells[0] : {};
        finalCells = [{
          ...existingCell,
          type: 'header' as const,
          content: updatedItem.title || '',
          position: existingCell.position || 0,
          is_active: existingCell.is_active !== undefined ? existingCell.is_active : true
        }];
      }
      
      if ((updatedItem.type === 'text' || originalItem.type === 'text') && updatedItem.description !== undefined) {
        const existingCell: any = (Array.isArray(finalCells) && finalCells[0]) ? finalCells[0] : {};
        finalCells = [{
          ...existingCell,
          type: 'description' as const,
          content: updatedItem.description || '',
          position: existingCell.position || 0,
          is_active: existingCell.is_active !== undefined ? existingCell.is_active : true
        }];
      }
      
      if (updatedItem.type === 'button' || originalItem.type === 'button') {
        const existingCell: any = (Array.isArray(finalCells) && finalCells[0]) ? finalCells[0] : {};
        finalCells = [{
          ...existingCell,
          type: 'button_external' as const,
          content: updatedItem.title !== undefined ? updatedItem.title : (existingCell.content || ''),
          url: updatedItem.url !== undefined ? updatedItem.url : (existingCell.url || ''),
          position: existingCell.position || 0,
          is_active: existingCell.is_active !== undefined ? existingCell.is_active : true
        }];
      }
      
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
          cells: finalCells as any,
          // Preserve column_index - critical to prevent elements jumping columns
          column_index: (updatedItem as any).column_index ?? (originalItem as any).column_index ?? 0,
          text_color: updatedItem.text_color,
          background_color: updatedItem.background_color,
          font_size: updatedItem.font_size,
          font_weight: updatedItem.font_weight ? Number(updatedItem.font_weight) : undefined,
          padding: updatedItem.padding,
          margin_top: updatedItem.margin_top,
          margin_bottom: updatedItem.margin_bottom,
          border_radius: updatedItem.border_radius,
          opacity: updatedItem.opacity,
          icon_color: updatedItem.icon_color,
          icon_size: updatedItem.icon_size,
          icon_spacing: updatedItem.icon_spacing,
          icon_position: updatedItem.icon_position,
          style_class: updatedItem.style_class,
          text_align: updatedItem.text_align,
          // Dodatkowe pola stylów
          object_fit: updatedItem.object_fit,
          max_width: updatedItem.max_width,
          max_height: updatedItem.max_height,
          box_shadow: updatedItem.box_shadow,
          border_width: updatedItem.border_width,
          border_color: updatedItem.border_color,
          border_style: updatedItem.border_style,
          link_target: updatedItem.link_target,
          lazy_loading: updatedItem.lazy_loading,
          hover_scale: updatedItem.hover_scale,
          hover_opacity: updatedItem.hover_opacity,
          // Numbering fields
          show_number: updatedItem.show_number,
          number_type: updatedItem.number_type,
          custom_number: updatedItem.custom_number,
          custom_number_image: updatedItem.custom_number_image,
          // Visibility fields
          visible_to_everyone: updatedItem.visible_to_everyone,
          visible_to_clients: updatedItem.visible_to_clients,
          visible_to_partners: updatedItem.visible_to_partners,
          visible_to_specjalista: updatedItem.visible_to_specjalista,
          visible_to_anonymous: updatedItem.visible_to_anonymous,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItemId);
      
      if (error) throw error;
      
      const updatedItemWithCells = { ...updatedItem, cells: finalCells };
      setItems(prev => prev.map(i => 
        i.id === editingItemId ? { ...i, ...updatedItemWithCells } as CMSItem : i
      ));
      
      saveToHistory(
        sections, 
        items.map(i => i.id === editingItemId ? { ...i, ...updatedItemWithCells } as CMSItem : i)
      );
      
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można zapisać elementu',
        variant: 'destructive',
      });
    }
  }, [editingItemId, items, sections, setItems, saveToHistory, setHasUnsavedChanges, toast]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    try {
      setItems(prev => prev.filter(i => i.id !== itemId));
      
      const { error } = await supabase
        .from('cms_items')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      
      if (error) {
        await fetchData();
        throw error;
      }
      
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
  }, [items, sections, setItems, saveToHistory, setHasUnsavedChanges, fetchData, toast]);

  const handleDuplicateItem = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .insert([{
          page_id: pageId,
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
          cells: item.cells as any,
          // Copy visibility settings
          visible_to_everyone: (item as any).visible_to_everyone ?? true,
          visible_to_clients: (item as any).visible_to_clients ?? false,
          visible_to_partners: (item as any).visible_to_partners ?? false,
          visible_to_specjalista: (item as any).visible_to_specjalista ?? false,
          visible_to_anonymous: (item as any).visible_to_anonymous ?? false,
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
  }, [pageId, items, sections, setItems, saveToHistory, setHasUnsavedChanges, toast]);

  const handleMoveItemUp = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const sectionItems = items
      .filter(i => i.section_id === item.section_id && (i as any).column_index === (item as any).column_index)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    const currentIndex = sectionItems.findIndex(i => i.id === itemId);
    if (currentIndex <= 0) return;
    
    const newItems = [...sectionItems];
    [newItems[currentIndex], newItems[currentIndex - 1]] = [newItems[currentIndex - 1], newItems[currentIndex]];
    
    setItems(prev => prev.map(i => {
      const itemInNew = newItems.find(ni => ni.id === i.id);
      if (!itemInNew) return i;
      const newIdx = newItems.indexOf(itemInNew);
      return { ...i, position: newIdx };
    }));
    
    try {
      await Promise.all(newItems.map((item, idx) =>
        supabase
          .from('cms_items')
          .update({ position: idx, updated_at: new Date().toISOString() })
          .eq('id', item.id as string)
      ));
      
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error moving item up:', error);
      toast({ title: 'Błąd', description: 'Nie udało się przenieść elementu', variant: 'destructive' });
      await fetchData();
    }
  }, [items, setItems, setHasUnsavedChanges, fetchData, toast]);

  const handleMoveItemDown = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const sectionItems = items
      .filter(i => i.section_id === item.section_id && (i as any).column_index === (item as any).column_index)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    const currentIndex = sectionItems.findIndex(i => i.id === itemId);
    if (currentIndex >= sectionItems.length - 1) return;
    
    const newItems = [...sectionItems];
    [newItems[currentIndex], newItems[currentIndex + 1]] = [newItems[currentIndex + 1], newItems[currentIndex]];
    
    setItems(prev => prev.map(i => {
      const itemInNew = newItems.find(ni => ni.id === i.id);
      if (!itemInNew) return i;
      const newIdx = newItems.indexOf(itemInNew);
      return { ...i, position: newIdx };
    }));
    
    try {
      await Promise.all(newItems.map((item, idx) =>
        supabase
          .from('cms_items')
          .update({ position: idx, updated_at: new Date().toISOString() })
          .eq('id', item.id as string)
      ));
      
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error moving item down:', error);
      toast({ title: 'Błąd', description: 'Nie udało się przenieść elementu', variant: 'destructive' });
      await fetchData();
    }
  }, [items, setItems, setHasUnsavedChanges, fetchData, toast]);

  const closeItemEditor = useCallback(() => {
    setIsItemEditorOpen(false);
    setEditingItemId(null);
  }, []);

  // Quick visibility update without opening full editor
  const updateItemVisibility = useCallback(async (itemId: string, visibility: {
    visible_to_everyone?: boolean;
    visible_to_clients?: boolean;
    visible_to_partners?: boolean;
    visible_to_specjalista?: boolean;
    visible_to_anonymous?: boolean;
  }) => {
    try {
      const { error } = await supabase
        .from('cms_items')
        .update({
          ...visibility,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);
      
      if (error) throw error;
      
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, ...visibility } as CMSItem : i
      ));
      
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error updating item visibility:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można zaktualizować widoczności',
        variant: 'destructive',
      });
    }
  }, [setItems, setHasUnsavedChanges, toast]);

  return {
    editingItemId,
    isItemEditorOpen,
    setEditingItemId,
    setIsItemEditorOpen,
    handleEditItem,
    handleSaveItem,
    handleDeleteItem,
    handleDuplicateItem,
    handleMoveItemUp,
    handleMoveItemDown,
    closeItemEditor,
    updateItemVisibility,
  };
};
