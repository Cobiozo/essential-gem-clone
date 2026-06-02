import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IntroVideoSettings {
  id: string;
  enabled: boolean;
  video_url: string | null;
  show_on_auth_only: boolean;
  show_on_anonymous: boolean;
  frequency: 'always' | 'once_per_session' | 'once_per_day';
  skip_after_ms: number;
  allow_skip: boolean;
  default_muted: boolean;
}

export const useIntroVideoSettings = () => {
  return useQuery({
    queryKey: ['intro-video-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intro_video_settings' as any)
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as IntroVideoSettings | null;
    },
    staleTime: 5 * 60 * 1000,
  });
};
