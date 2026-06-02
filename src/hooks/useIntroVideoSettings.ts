import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IntroFrequency =
  | 'always'
  | 'once_per_session'
  | 'once_per_day'
  | 'once_per_week'
  | 'once_per_user'
  | 'every_login';

export type IntroTriggerMoment =
  | 'app_start'
  | 'before_login'
  | 'after_login'
  | 'auth_page'
  | 'dashboard_entry';

export const TRIGGER_MOMENT_LABELS: Record<IntroTriggerMoment, string> = {
  app_start: 'Po włączeniu strony',
  auth_page: 'Na stronie logowania (/auth)',
  before_login: 'Przed zalogowaniem (niezalogowani na /auth)',
  after_login: 'Po prawidłowym logowaniu',
  dashboard_entry: 'Przy wejściu do dashboardu',
};

export const ALL_TRIGGER_MOMENTS: IntroTriggerMoment[] = [
  'app_start',
  'auth_page',
  'before_login',
  'after_login',
  'dashboard_entry',
];

export interface IntroVideoSettings {
  id: string;
  enabled: boolean;
  video_url: string | null;
  show_on_auth_only: boolean;
  show_on_anonymous: boolean;
  frequency: IntroFrequency;
  trigger_moments: IntroTriggerMoment[];
  /** @deprecated kept for backward compatibility */
  trigger_moment?: IntroTriggerMoment | null;
  skip_after_ms: number;
  allow_skip: boolean;
  default_muted: boolean;
}

export const normalizeSettings = (raw: any): IntroVideoSettings | null => {
  if (!raw) return null;
  const moments: IntroTriggerMoment[] = Array.isArray(raw.trigger_moments) && raw.trigger_moments.length > 0
    ? raw.trigger_moments
    : raw.trigger_moment
      ? [raw.trigger_moment]
      : ['app_start'];
  return {
    id: raw.id,
    enabled: !!raw.enabled,
    video_url: raw.video_url ?? null,
    show_on_auth_only: !!raw.show_on_auth_only,
    show_on_anonymous: raw.show_on_anonymous ?? true,
    frequency: (raw.frequency ?? 'always') as IntroFrequency,
    trigger_moments: moments,
    trigger_moment: raw.trigger_moment ?? null,
    skip_after_ms: raw.skip_after_ms ?? 1500,
    allow_skip: raw.allow_skip ?? true,
    default_muted: raw.default_muted ?? true,
  };
};

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
      return normalizeSettings(data);
    },
    staleTime: 5 * 60 * 1000,
  });
};
