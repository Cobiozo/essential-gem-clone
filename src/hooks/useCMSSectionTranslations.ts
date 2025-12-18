import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CMSSectionTranslation {
  id: string;
  section_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
  collapsible_header: string | null;
}

interface CMSSection {
  id: string;
  title?: string | null;
  description?: string | null;
  collapsible_header?: string | null;
  [key: string]: any;
}

/**
 * Hook to fetch and merge CMS section translations for a given language.
 * Returns translated sections if translations exist, otherwise original sections.
 */
export const useCMSSectionTranslations = <T extends CMSSection>(
  sections: T[],
  languageCode: string,
  defaultLanguage: string = 'pl'
): T[] => {
  const [translations, setTranslations] = useState<CMSSectionTranslation[]>([]);
  const [loading, setLoading] = useState(false);

  // Stable section IDs for dependency tracking
  const sectionIds = useMemo(() => sections.map(s => s.id).sort().join(','), [sections]);

  useEffect(() => {
    // Skip fetching if using default language or no sections
    if (languageCode === defaultLanguage || sections.length === 0) {
      setTranslations([]);
      return;
    }

    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const ids = sections.map(s => s.id);
        
        const { data, error } = await supabase
          .from('cms_section_translations')
          .select('*')
          .eq('language_code', languageCode)
          .in('section_id', ids);

        if (error) {
          console.error('Error fetching CMS section translations:', error);
          setTranslations([]);
        } else {
          setTranslations(data || []);
        }
      } catch (err) {
        console.error('Error in useCMSSectionTranslations:', err);
        setTranslations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, [languageCode, defaultLanguage, sectionIds]);

  // Merge translations with original sections
  const translatedSections = useMemo(() => {
    // If using default language, return original sections
    if (languageCode === defaultLanguage) {
      return sections;
    }

    // Create a map for quick translation lookup
    const translationMap = new Map<string, CMSSectionTranslation>();
    translations.forEach(t => translationMap.set(t.section_id, t));

    // Merge translations with original sections
    return sections.map(section => {
      const translation = translationMap.get(section.id);
      
      if (!translation) {
        return section;
      }

      return {
        ...section,
        title: translation.title || section.title,
        description: translation.description || section.description,
        collapsible_header: translation.collapsible_header || section.collapsible_header
      };
    });
  }, [sections, translations, languageCode, defaultLanguage]);

  return translatedSections;
};
