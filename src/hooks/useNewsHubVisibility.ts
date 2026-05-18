import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NewsHubModuleSettings {
  is_active: boolean;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
}

const DEFAULTS: NewsHubModuleSettings = {
  is_active: true,
  visible_to_admin: true,
  visible_to_partner: true,
  visible_to_client: true,
  visible_to_specjalista: true,
};

export function useNewsHubVisibility() {
  const { user, userRole, isAdmin } = useAuth();
  const role = userRole?.role?.toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ['news-hub-visibility', user?.id, role],
    queryFn: async () => {
      const [settingsRes, accessRes] = await Promise.all([
        (supabase.from('news_hub_settings' as any) as any)
          .select('is_active, visible_to_admin, visible_to_partner, visible_to_client, visible_to_specjalista')
          .eq('id', true)
          .maybeSingle(),
        user?.id
          ? (supabase.from('news_hub_user_access' as any) as any)
              .select('is_enabled')
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        settings: (settingsRes.data || DEFAULTS) as NewsHubModuleSettings,
        userOverride: (accessRes.data as any)?.is_enabled as boolean | undefined,
      };
    },
    staleTime: 60_000,
  });

  const settings = data?.settings || DEFAULTS;

  const isModuleVisible = (): boolean => {
    if (isAdmin) return true;
    if (!settings.is_active) return false;
    if (data?.userOverride === true) return true;
    if (data?.userOverride === false) return false;
    switch (role) {
      case 'admin': return settings.visible_to_admin;
      case 'partner': return settings.visible_to_partner;
      case 'client':
      case 'user': return settings.visible_to_client;
      case 'specjalista': return settings.visible_to_specjalista;
      default: return false;
    }
  };

  return { settings, isModuleVisible: isModuleVisible(), loading: isLoading };
}
