import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SpecialistSearchSettings {
  is_enabled: boolean;
  visible_to_clients: boolean;
  visible_to_partners: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  max_results: number;
}

export const useSpecialistSearch = () => {
  const { user, userRole } = useAuth();

  const { data: settings, isLoading: loading, refetch } = useQuery({
    queryKey: ['specialist-search-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialist_search_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        return null;
      }

      return data as SpecialistSearchSettings | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });

  // Compute access based on settings and role - memoized to prevent unnecessary recalculations
  const canAccess = useMemo(() => {
    if (!settings?.is_enabled) {
      return false;
    }
    
    if (!user) {
      return settings.visible_to_anonymous;
    }
    
    const role = String(userRole || 'client').toLowerCase();
    switch (role) {
      case 'admin':
        return true;
      case 'client':
        return settings.visible_to_clients;
      case 'partner':
        return settings.visible_to_partners;
      case 'specjalista':
      case 'specialist':
        return settings.visible_to_specjalista;
      default:
        return settings.visible_to_clients;
    }
  }, [settings, user, userRole]);

  return { settings: settings ?? null, loading, canAccess, refetch };
};
