import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CMSSection, CMSItem } from '@/types/cms';
import { convertSupabaseSection } from '@/lib/typeUtils';

interface UseSectionManagerProps {
  pageId: string;
  sections: CMSSection[];
  items: CMSItem[];
  setSections: React.Dispatch<React.SetStateAction<CMSSection[]>>;
  saveToHistory: (sections: CMSSection[], items: CMSItem[]) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export const useSectionManager = ({
  pageId,
  sections,
  items,
  setSections,
  saveToHistory,
  setHasUnsavedChanges,
}: UseSectionManagerProps) => {
  const { toast } = useToast();
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [isSectionEditorOpen, setIsSectionEditorOpen] = useState(false);

  const handleEditSection = useCallback((sectionId: string) => {
    console.log('[handleEditSection] Opening editor for section:', sectionId);
    
    const section = sections.find(s => s.id === sectionId);
    if (!section) {
      console.error('[handleEditSection] Section not found:', sectionId);
      return;
    }
    
    setIsSectionEditorOpen(false);
    setEditingSectionId(null);
    
    setTimeout(() => {
      setEditingSectionId(sectionId);
      setIsSectionEditorOpen(true);
    }, 50);
  }, [sections]);

  const handleSaveSection = useCallback(async (updatedSection: Partial<CMSSection>) => {
    // Use updatedSection.id as fallback when editingSectionId is null
    const sectionId = editingSectionId || updatedSection.id;
    
    console.log('[handleSaveSection] Called with:', {
      editingSectionId,
      sectionIdFromObject: updatedSection.id,
      finalSectionId: sectionId,
      padding: updatedSection.padding,
      section_margin_top: updatedSection.section_margin_top,
      section_margin_bottom: updatedSection.section_margin_bottom,
    });
    
    if (!sectionId) {
      console.error('[handleSaveSection] No section ID available!');
      toast({
        title: 'Błąd',
        description: 'Nie można zapisać sekcji - brak ID',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('cms_sections')
        .update({
          // Podstawowe
          title: updatedSection.title,
          description: updatedSection.description,
          is_active: updatedSection.is_active,
          show_title: updatedSection.show_title,
          default_expanded: updatedSection.default_expanded,
          collapsible_header: updatedSection.collapsible_header,
          
          // Kolory
          background_color: updatedSection.background_color,
          text_color: updatedSection.text_color,
          background_gradient: updatedSection.background_gradient,
          
          // Marginesy i padding
          padding: updatedSection.padding,
          margin: updatedSection.margin,
          section_margin_top: updatedSection.section_margin_top,
          section_margin_bottom: updatedSection.section_margin_bottom,
          
          // Obramowanie
          border_radius: updatedSection.border_radius,
          border_width: updatedSection.border_width,
          border_color: updatedSection.border_color,
          border_style: updatedSection.border_style,
          box_shadow: updatedSection.box_shadow,
          opacity: updatedSection.opacity,
          
          // Rozmiar
          width_type: updatedSection.width_type,
          custom_width: updatedSection.custom_width,
          height_type: updatedSection.height_type,
          custom_height: updatedSection.custom_height,
          max_width: updatedSection.max_width,
          min_height: updatedSection.min_height,
          
          // Typografia
          font_size: updatedSection.font_size,
          font_weight: updatedSection.font_weight,
          line_height: updatedSection.line_height,
          letter_spacing: updatedSection.letter_spacing,
          text_transform: updatedSection.text_transform,
          alignment: updatedSection.alignment,
          
          // Layout
          display_type: updatedSection.display_type,
          justify_content: updatedSection.justify_content,
          align_items: updatedSection.align_items,
          gap: updatedSection.gap,
          content_direction: updatedSection.content_direction,
          content_wrap: updatedSection.content_wrap,
          overflow_behavior: updatedSection.overflow_behavior,
          
          // Obraz tła
          background_image: updatedSection.background_image,
          background_image_opacity: updatedSection.background_image_opacity,
          background_image_position: updatedSection.background_image_position,
          background_image_size: updatedSection.background_image_size,
          
          // Ikona
          icon_name: updatedSection.icon_name,
          icon_position: updatedSection.icon_position,
          icon_size: updatedSection.icon_size,
          icon_color: updatedSection.icon_color,
          show_icon: updatedSection.show_icon,
          
          // Efekty hover
          hover_background_color: updatedSection.hover_background_color,
          hover_background_gradient: updatedSection.hover_background_gradient,
          hover_text_color: updatedSection.hover_text_color,
          hover_border_color: updatedSection.hover_border_color,
          hover_box_shadow: updatedSection.hover_box_shadow,
          hover_opacity: updatedSection.hover_opacity,
          hover_scale: updatedSection.hover_scale,
          hover_transition_duration: updatedSection.hover_transition_duration,
          
          // Klasy CSS i widoczność
          style_class: updatedSection.style_class,
          visible_to_everyone: updatedSection.visible_to_everyone,
          visible_to_clients: updatedSection.visible_to_clients,
          visible_to_partners: updatedSection.visible_to_partners,
          visible_to_specjalista: updatedSection.visible_to_specjalista,
          visible_to_anonymous: updatedSection.visible_to_anonymous,
          
          // Wiersze
          section_type: updatedSection.section_type,
          row_layout_type: updatedSection.row_layout_type,
          row_column_count: updatedSection.row_column_count,
          
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId);
      
      if (error) throw error;
      
      console.log('[handleSaveSection] Successfully saved section:', sectionId);
      
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...updatedSection } as CMSSection : s));
      saveToHistory(sections.map(s => s.id === sectionId ? { ...s, ...updatedSection } as CMSSection : s), items);
      setHasUnsavedChanges(true);
      setIsSectionEditorOpen(false);
      setEditingSectionId(null);
      
      toast({
        title: 'Sukces',
        description: 'Sekcja została zapisana',
      });
    } catch (error) {
      console.error('Error saving section:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można zapisać sekcji',
        variant: 'destructive',
      });
    }
  }, [editingSectionId, sections, items, setSections, saveToHistory, setHasUnsavedChanges, toast]);

  const handleDuplicateSection = useCallback(async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    try {
      const { data, error } = await supabase
        .from('cms_sections')
        .insert({
          page_id: pageId,
          title: `${section.title} (kopia)`,
          description: section.description,
          position: sections.length,
          
          // Widoczność
          visible_to_everyone: section.visible_to_everyone,
          visible_to_clients: section.visible_to_clients,
          visible_to_partners: section.visible_to_partners,
          visible_to_specjalista: section.visible_to_specjalista,
          visible_to_anonymous: section.visible_to_anonymous,
          
          // Kolory
          background_color: section.background_color,
          text_color: section.text_color,
          background_gradient: section.background_gradient,
          
          // Marginesy i padding
          padding: section.padding,
          margin: section.margin,
          section_margin_top: section.section_margin_top,
          section_margin_bottom: section.section_margin_bottom,
          
          // Obramowanie
          border_radius: section.border_radius,
          border_width: section.border_width,
          border_color: section.border_color,
          border_style: section.border_style,
          box_shadow: section.box_shadow,
          opacity: section.opacity,
          
          // Rozmiar
          width_type: section.width_type,
          custom_width: section.custom_width,
          height_type: section.height_type,
          custom_height: section.custom_height,
          max_width: section.max_width,
          min_height: section.min_height,
          
          // Typografia
          font_size: section.font_size,
          font_weight: section.font_weight,
          line_height: section.line_height,
          letter_spacing: section.letter_spacing,
          text_transform: section.text_transform,
          alignment: section.alignment,
          
          // Layout
          display_type: section.display_type,
          justify_content: section.justify_content,
          align_items: section.align_items,
          gap: section.gap,
          content_direction: section.content_direction,
          content_wrap: section.content_wrap,
          overflow_behavior: section.overflow_behavior,
          
          // Obraz tła
          background_image: section.background_image,
          background_image_opacity: section.background_image_opacity,
          background_image_position: section.background_image_position,
          background_image_size: section.background_image_size,
          
          // Ikona
          icon_name: section.icon_name,
          icon_position: section.icon_position,
          icon_size: section.icon_size,
          icon_color: section.icon_color,
          show_icon: section.show_icon,
          
          // Efekty hover
          hover_background_color: section.hover_background_color,
          hover_background_gradient: section.hover_background_gradient,
          hover_text_color: section.hover_text_color,
          hover_border_color: section.hover_border_color,
          hover_box_shadow: section.hover_box_shadow,
          hover_opacity: section.hover_opacity,
          hover_scale: section.hover_scale,
          hover_transition_duration: section.hover_transition_duration,
          
          // Klasy CSS
          style_class: section.style_class,
          default_expanded: section.default_expanded,
          show_title: section.show_title,
          collapsible_header: section.collapsible_header,
          
          // Wiersze
          section_type: section.section_type,
          row_layout_type: section.row_layout_type,
          row_column_count: section.row_column_count,
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
  }, [pageId, sections, setSections, toast]);

  const handleDeactivateSection = useCallback(async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    if (!confirm(`Czy na pewno chcesz ukryć "${section.title}"?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('hide-cms-element', {
        body: { id: sectionId, elementType: 'section', isActive: false },
      });

      if (error || data?.ok === false) {
        throw new Error(error?.message || data?.error || 'Unknown error');
      }

      setSections(prev => prev.filter(s => s.id !== sectionId));
      setHasUnsavedChanges(false);

      toast({
        title: 'Sukces',
        description: 'Sekcja została ukryta',
      });
    } catch (error) {
      console.error('Error deactivating section:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można ukryć sekcji',
        variant: 'destructive',
      });
    }
  }, [sections, setSections, setHasUnsavedChanges, toast]);

  const handleResetSection = useCallback(async (sectionId: string) => {
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
        .eq('id', sectionId);
      
      if (error) throw error;
      
      setSections(prev => prev.map(s => 
        s.id === sectionId 
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
  }, [setSections, toast]);

  const handleAlignSection = useCallback(async (sectionId: string, alignment: 'left' | 'center' | 'right' | 'justify') => {
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
        .eq('id', sectionId);
      
      if (error) throw error;
      
      setSections(prev => prev.map(s => 
        s.id === sectionId 
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
  }, [setSections, toast]);

  const handleSizeSection = useCallback(async (sectionId: string, sizeType: 'fit' | 'full') => {
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
        .eq('id', sectionId);
      
      if (error) throw error;
      
      setSections(prev => prev.map(s => 
        s.id === sectionId 
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
  }, [setSections, toast]);

  const closeSectionEditor = useCallback(() => {
    setIsSectionEditorOpen(false);
    setEditingSectionId(null);
  }, []);

  // Quick visibility update without opening full editor
  const updateSectionVisibility = useCallback(async (sectionId: string, visibility: {
    visible_to_everyone?: boolean;
    visible_to_clients?: boolean;
    visible_to_partners?: boolean;
    visible_to_specjalista?: boolean;
    visible_to_anonymous?: boolean;
  }) => {
    try {
      const { error } = await supabase
        .from('cms_sections')
        .update({
          ...visibility,
          updated_at: new Date().toISOString()
        })
        .eq('id', sectionId);
      
      if (error) throw error;
      
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, ...visibility } as CMSSection : s
      ));
      
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error updating section visibility:', error);
      toast({
        title: 'Błąd',
        description: 'Nie można zaktualizować widoczności',
        variant: 'destructive',
      });
    }
  }, [setSections, setHasUnsavedChanges, toast]);

  return {
    editingSectionId,
    isSectionEditorOpen,
    setEditingSectionId,
    setIsSectionEditorOpen,
    handleEditSection,
    handleSaveSection,
    handleDuplicateSection,
    handleDeactivateSection,
    handleResetSection,
    handleAlignSection,
    handleSizeSection,
    closeSectionEditor,
    updateSectionVisibility,
  };
};
