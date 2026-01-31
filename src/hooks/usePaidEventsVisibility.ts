import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaidEventsVisibility {
  is_enabled: boolean;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_specjalista: boolean;
  visible_to_client: boolean;
}

export const usePaidEventsVisibility = () => {
  return useQuery({
    queryKey: ['paid-events-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paid_events_settings')
        .select('is_enabled, visible_to_admin, visible_to_partner, visible_to_specjalista, visible_to_client')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching paid events visibility:', error);
        // Default to all hidden if fetch fails (safe default)
        return {
          is_enabled: false,
          visible_to_admin: true,
          visible_to_partner: false,
          visible_to_specjalista: false,
          visible_to_client: false,
        } as PaidEventsVisibility;
      }

      return data as PaidEventsVisibility;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const isRoleVisibleForPaidEvents = (
  visibility: PaidEventsVisibility | undefined,
  role: string | undefined
): boolean => {
  // If no visibility settings or module disabled, hide for non-admins
  if (!visibility || !visibility.is_enabled) {
    return role?.toLowerCase() === 'admin'; // Admins can always see if enabled check fails
  }
  
  if (!role) return false;
  
  const normalizedRole = role.toLowerCase();
  
  switch (normalizedRole) {
    case 'admin':
      return visibility.visible_to_admin;
    case 'partner':
      return visibility.visible_to_partner;
    case 'specjalista':
      return visibility.visible_to_specjalista;
    case 'client':
    case 'user':
      return visibility.visible_to_client;
    default:
      return false;
  }
};
