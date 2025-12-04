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
    if (!editingSectionId) return;
    
    try {
      const { error } = await supabase
        .from('cms_sections')
        .update({
          title: updatedSection.title,
          description: updatedSection.description,
          background_color: updatedSection.background_color,
          text_color: updatedSection.text_color,
          font_size: updatedSection.font_size,
          alignment: updatedSection.alignment,
          padding: updatedSection.padding,
          margin: updatedSection.margin,
          border_radius: updatedSection.border_radius,
          style_class: updatedSection.style_class,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSectionId);
      
      if (error) throw error;
      
      setSections(prev => prev.map(s => s.id === editingSectionId ? { ...s, ...updatedSection } as CMSSection : s));
      saveToHistory(sections.map(s => s.id === editingSectionId ? { ...s, ...updatedSection } as CMSSection : s), items);
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
          visible_to_everyone: section.visible_to_everyone,
          visible_to_clients: section.visible_to_clients,
          visible_to_partners: section.visible_to_partners,
          visible_to_specjalista: section.visible_to_specjalista,
          visible_to_anonymous: section.visible_to_anonymous,
          background_color: section.background_color,
          text_color: section.text_color,
          style_class: section.style_class
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
  };
};
