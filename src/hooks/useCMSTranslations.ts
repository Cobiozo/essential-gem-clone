import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
 *
 * Cached via React Query (5 min stale / 30 min gc) to avoid refetching
 * the same translations on every page navigation.
 */
export const useCMSTranslations = (
  items: CMSItem[],
  languageCode: string,
  defaultLanguage: string = 'pl'
): CMSItem[] => {
  // Stable sorted IDs as cache key
  const sortedIds = useMemo(
    () => items.map((i) => i.id).filter(Boolean).sort(),
    [items]
  );
  const idsKey = sortedIds.join(',');

  const { data: translations = [] } = useQuery<CMSTranslation[]>({
    queryKey: ['cms-item-translations', languageCode, idsKey],
    enabled: languageCode !== defaultLanguage && sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_item_translations')
        .select('*')
        .eq('language_code', languageCode)
        .in('item_id', sortedIds as string[]);
      if (error) {
        console.error('Error fetching CMS translations:', error);
        return [];
      }
      return (data as CMSTranslation[]) || [];
    },
  });

  return useMemo(() => {
    if (languageCode === defaultLanguage) return items;

    const translationMap = new Map<string, CMSTranslation>();
    translations.forEach((t) => translationMap.set(t.item_id, t));

    return items.map((item) => {
      const translation = item.id ? translationMap.get(item.id) : undefined;
      if (!translation) return item;

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
        cells: translatedCells,
      };
    });
  }, [items, translations, languageCode, defaultLanguage]);
};
