import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PureBoxSetting {
  element_key: string;
  is_active: boolean;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
}

interface PureBoxUserAccess {
  element_key: string;
  is_enabled: boolean;
}

export const usePureBoxVisibility = () => {
  const { user, userRole } = useAuth();
  const role = userRole?.role?.toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ['purebox-visibility', user?.id, role],
    queryFn: async () => {
      const [settingsRes, accessRes] = await Promise.all([
        supabase.from('purebox_settings' as any).select('element_key, is_active, visible_to_admin, visible_to_partner, visible_to_client, visible_to_specjalista'),
        user?.id
          ? supabase.from('purebox_user_access' as any).select('element_key, is_enabled').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ]);

      return {
        settings: (settingsRes.data || []) as unknown as PureBoxSetting[],
        userAccess: (accessRes.data || []) as unknown as PureBoxUserAccess[],
      };
    },
    enabled: !!user && !!role,
    staleTime: 5 * 60 * 1000,
  });

  const isPureBoxEnabled = (): boolean => {
    if (!data) return false;
    const master = data.settings.find(s => s.element_key === 'purebox-master');
    return !!master?.is_active;
  };

  const isVisible = (elementKey: string): boolean => {
    if (!data) return false;

    // Master toggle check
    if (!isPureBoxEnabled()) return false;

    const setting = data.settings.find(s => s.element_key === elementKey);
    if (!setting || !setting.is_active) return false;

    // Check individual user access first
    const userAccess = data.userAccess.find(a => a.element_key === elementKey);
    if (userAccess?.is_enabled) return true;

    // Check role-based visibility
    switch (role) {
      case 'admin': return setting.visible_to_admin;
      case 'partner': return setting.visible_to_partner;
      case 'client':
      case 'user': return setting.visible_to_client;
      case 'specjalista': return setting.visible_to_specjalista;
      default: return false;
    }
  };

  return { isVisible, loading: isLoading };
};
