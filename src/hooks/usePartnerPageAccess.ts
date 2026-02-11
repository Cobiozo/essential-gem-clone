import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePartnerPageAccess = () => {
  const { user, userRole } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !userRole) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        // Fetch global settings
        const { data: settings } = await supabase
          .from('partner_page_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!settings?.is_system_active) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Check individual access first (overrides role)
        const { data: userAccess } = await supabase
          .from('partner_page_user_access')
          .select('is_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userAccess) {
          setHasAccess(userAccess.is_enabled);
          setLoading(false);
          return;
        }

        // Check role-based access
        const role = userRole.role;
        let roleEnabled = false;
        if (role === 'partner') roleEnabled = settings.enabled_for_partner;
        else if (role === 'specjalista') roleEnabled = settings.enabled_for_specjalista;
        else if (role === 'client') roleEnabled = settings.enabled_for_client;
        else if (role === 'admin') roleEnabled = settings.enabled_for_admin;

        setHasAccess(roleEnabled);
      } catch (error) {
        console.error('Error checking partner page access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, userRole]);

  return { hasAccess, loading };
};
