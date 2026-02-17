import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HealthyKnowledge } from '@/types/healthyKnowledge';

interface HKTranslation {
  id: string;
  item_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
  text_content: string | null;
}

export const useHealthyKnowledgeTranslations = (
  items: HealthyKnowledge[],
  languageCode: string,
  defaultLanguage: string = 'pl'
): HealthyKnowledge[] => {
  const [translations, setTranslations] = useState<HKTranslation[]>([]);

  const itemIds = useMemo(() => items.map(i => i.id).sort().join(','), [items]);

  useEffect(() => {
    if (languageCode === defaultLanguage || items.length === 0) {
      setTranslations([]);
      return;
    }

    supabase
      .from('healthy_knowledge_translations')
      .select('*')
      .eq('language_code', languageCode)
      .in('item_id', items.map(i => i.id))
      .then(({ data, error }) => {
        if (!error) setTranslations((data as HKTranslation[]) || []);
      });
  }, [languageCode, defaultLanguage, itemIds]);

  return useMemo(() => {
    if (languageCode === defaultLanguage) return items;
    const map = new Map(translations.map(t => [t.item_id, t]));
    return items.map(item => {
      const t = map.get(item.id);
      if (!t) return item;
      return {
        ...item,
        title: t.title || item.title,
        description: t.description !== null ? t.description : item.description,
        text_content: t.text_content !== null ? t.text_content : item.text_content,
      };
    });
  }, [items, translations, languageCode, defaultLanguage]);
};
