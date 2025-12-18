import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CMSItem, ContentCell } from '@/types/cms';

interface CMSTranslation {
  id: string;
  item_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
  cells: any | null;
}

/**
 * Hook to fetch and merge CMS translations for a given language.
 * Returns translated items if translations exist, otherwise original items.
 */
export const useCMSTranslations = (
  items: CMSItem[],
  languageCode: string,
  defaultLanguage: string = 'pl'
): CMSItem[] => {
  const [translations, setTranslations] = useState<CMSTranslation[]>([]);
  const [loading, setLoading] = useState(false);

  // Stable item IDs for dependency tracking
  const itemIds = useMemo(() => items.map(i => i.id).sort().join(','), [items]);

  useEffect(() => {
    // Skip fetching if using default language or no items
    if (languageCode === defaultLanguage || items.length === 0) {
      setTranslations([]);
      return;
    }

    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const ids = items.map(i => i.id);
        
        const { data, error } = await supabase
          .from('cms_item_translations')
          .select('*')
          .eq('language_code', languageCode)
          .in('item_id', ids);

        if (error) {
          console.error('Error fetching CMS translations:', error);
          setTranslations([]);
        } else {
          setTranslations(data || []);
        }
      } catch (err) {
        console.error('Error in useCMSTranslations:', err);
        setTranslations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, [languageCode, defaultLanguage, itemIds]);

  // Merge translations with original items
  const translatedItems = useMemo(() => {
    // If using default language, return original items
    if (languageCode === defaultLanguage) {
      return items;
    }

    // Create a map for quick translation lookup
    const translationMap = new Map<string, CMSTranslation>();
    translations.forEach(t => translationMap.set(t.item_id, t));

    // Merge translations with original items
    return items.map(item => {
      const translation = translationMap.get(item.id);
      
      if (!translation) {
        return item;
      }

      // Parse cells if they're a string
      let translatedCells = item.cells;
      if (translation.cells) {
        if (typeof translation.cells === 'string') {
          try {
            translatedCells = JSON.parse(translation.cells);
          } catch {
            translatedCells = item.cells;
          }
        } else if (Array.isArray(translation.cells)) {
          translatedCells = translation.cells as ContentCell[];
        }
      }

      return {
        ...item,
        title: translation.title || item.title,
        description: translation.description || item.description,
        cells: translatedCells
      };
    });
  }, [items, translations, languageCode, defaultLanguage]);

  return translatedItems;
};
