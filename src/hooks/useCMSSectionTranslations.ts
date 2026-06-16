import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
 * Cached via React Query (5 min stale / 30 min gc).
 */
export const useCMSSectionTranslations = <T extends CMSSection>(
  sections: T[],
  languageCode: string,
  defaultLanguage: string = 'pl'
): T[] => {
  const sortedIds = useMemo(
    () => sections.map((s) => s.id).filter(Boolean).sort(),
    [sections]
  );
  const idsKey = sortedIds.join(',');

  const { data: translations = [] } = useQuery<CMSSectionTranslation[]>({
    queryKey: ['cms-section-translations', languageCode, idsKey],
    enabled: languageCode !== defaultLanguage && sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_section_translations')
        .select('*')
        .eq('language_code', languageCode)
        .in('section_id', sortedIds);
      if (error) {
        console.error('Error fetching CMS section translations:', error);
        return [];
      }
      return (data as CMSSectionTranslation[]) || [];
    },
  });

  return useMemo(() => {
    if (languageCode === defaultLanguage) return sections;

    const translationMap = new Map<string, CMSSectionTranslation>();
    translations.forEach((t) => translationMap.set(t.section_id, t));

    return sections.map((section) => {
      const translation = translationMap.get(section.id);
      if (!translation) return section;
      return {
        ...section,
        title: translation.title || section.title,
        description: translation.description || section.description,
        collapsible_header: translation.collapsible_header || section.collapsible_header,
      };
    });
  }, [sections, translations, languageCode, defaultLanguage]);
};
