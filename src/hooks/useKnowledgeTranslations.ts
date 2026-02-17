import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KnowledgeResource } from '@/types/knowledge';

interface ResourceTranslation {
  id: string;
  resource_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
  context_of_use: string | null;
}

export const useKnowledgeTranslations = (
  resources: KnowledgeResource[],
  languageCode: string,
  defaultLanguage: string = 'pl'
): KnowledgeResource[] => {
  const [translations, setTranslations] = useState<ResourceTranslation[]>([]);

  const resourceIds = useMemo(() => resources.map(r => r.id).sort().join(','), [resources]);

  useEffect(() => {
    if (languageCode === defaultLanguage || resources.length === 0) {
      setTranslations([]);
      return;
    }

    supabase
      .from('knowledge_resource_translations')
      .select('*')
      .eq('language_code', languageCode)
      .in('resource_id', resources.map(r => r.id))
      .then(({ data, error }) => {
        if (!error) setTranslations((data as ResourceTranslation[]) || []);
      });
  }, [languageCode, defaultLanguage, resourceIds]);

  return useMemo(() => {
    if (languageCode === defaultLanguage) return resources;
    const map = new Map(translations.map(t => [t.resource_id, t]));
    return resources.map(r => {
      const t = map.get(r.id);
      if (!t) return r;
      return {
        ...r,
        title: t.title || r.title,
        description: t.description || r.description,
        context_of_use: t.context_of_use || r.context_of_use,
      };
    });
  }, [resources, translations, languageCode, defaultLanguage]);
};
