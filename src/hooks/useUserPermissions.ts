import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PermissionItem {
  key: string;
  label: string;
  enabled: boolean;
  adminUrl: string;
}

interface UseUserPermissionsResult {
  permissions: PermissionItem[];
  loading: boolean;
}

export const useUserPermissions = (userId: string | null): UseUserPermissionsResult => {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setPermissions([]);
      return;
    }

    const fetchPermissions = async () => {
      setLoading(true);
      try {
        const [leaderRes, partnerPageRes, calcRes, specCalcRes] = await Promise.all([
          supabase
            .from('leader_permissions')
            .select('individual_meetings_enabled, tripartite_meeting_enabled, partner_consultation_enabled, can_broadcast')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('partner_page_user_access')
            .select('is_enabled')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('calculator_user_access')
            .select('has_access')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('specialist_calculator_user_access')
            .select('has_access')
            .eq('user_id', userId)
            .maybeSingle(),
        ]);

        const lp = leaderRes.data;
        const items: PermissionItem[] = [
          {
            key: 'individual_meetings_enabled',
            label: 'Spotkania indywidualne',
            enabled: lp?.individual_meetings_enabled ?? false,
            adminUrl: '/admin?tab=events&subTab=individual-meetings',
          },
          {
            key: 'tripartite_meeting_enabled',
            label: 'Spotkania trójstronne',
            enabled: lp?.tripartite_meeting_enabled ?? false,
            adminUrl: '/admin?tab=events&subTab=individual-meetings',
          },
          {
            key: 'partner_consultation_enabled',
            label: 'Konsultacje partnerskie',
            enabled: lp?.partner_consultation_enabled ?? false,
            adminUrl: '/admin?tab=events&subTab=individual-meetings',
          },
          {
            key: 'can_broadcast',
            label: 'Nadawanie (Broadcast)',
            enabled: lp?.can_broadcast ?? false,
            adminUrl: '/admin?tab=events&subTab=individual-meetings',
          },
          {
            key: 'partner_page_access',
            label: 'Strony partnerskie',
            enabled: partnerPageRes.data?.is_enabled ?? false,
            adminUrl: '/admin?tab=partner-pages',
          },
          {
            key: 'calculator_access',
            label: 'Kalkulator',
            enabled: calcRes.data?.has_access ?? false,
            adminUrl: '/admin?tab=calculator',
          },
          {
            key: 'specialist_calculator_access',
            label: 'Kalkulator specjalisty',
            enabled: specCalcRes.data?.has_access ?? false,
            adminUrl: '/admin?tab=specialist-calculator',
          },
        ];

        setPermissions(items);
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [userId]);

  return { permissions, loading };
};
