import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePublishedPages = () => {
  return useQuery({
    queryKey: ['published-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, meta_description, created_at')
        .eq('is_published', true)
        .eq('is_active', true)
        .eq('visible_to_everyone', true)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minut - dane rzadko się zmieniają
    gcTime: 30 * 60 * 1000, // 30 minut cache w pamięci
  });
};
