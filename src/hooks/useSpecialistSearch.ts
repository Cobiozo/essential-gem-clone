import { useState, useEffect, useCallback } from 'react';
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
  const [settings, setSettings] = useState<SpecialistSearchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('specialist_search_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        return;
      }

      setSettings(data);

      // Check access based on role
      if (!data?.is_enabled) {
        setCanAccess(false);
      } else if (!user) {
        setCanAccess(data.visible_to_anonymous);
      } else {
        const role = String(userRole || 'client').toLowerCase();
        switch (role) {
          case 'admin':
            setCanAccess(true);
            break;
          case 'client':
            setCanAccess(data.visible_to_clients);
            break;
          case 'partner':
            setCanAccess(data.visible_to_partners);
            break;
          case 'specjalista':
          case 'specialist':
            setCanAccess(data.visible_to_specjalista);
            break;
          default:
            setCanAccess(data.visible_to_clients);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, canAccess, refetch: fetchSettings };
};
