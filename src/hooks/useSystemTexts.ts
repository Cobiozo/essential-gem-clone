import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemText {
  type: string;
  content: string | null;
  text_formatting: any;
}

export const useSystemTexts = () => {
  return useQuery({
    queryKey: ['system-texts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_texts')
        .select('type, content, text_formatting')
        .eq('is_active', true)
        .in('type', ['header_text', 'author', 'site_logo', 'header_image', 'header_image_size']);
      
      if (error) throw error;
      return (data || []) as SystemText[];
    },
    staleTime: 5 * 60 * 1000, // 5 minut - dane rzadko się zmieniają
    gcTime: 30 * 60 * 1000, // 30 minut cache w pamięci
  });
};
