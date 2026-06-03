import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GuardianProfileData {
  firstName: string | null;
  lastName: string | null;
  eqId: string | null;
  fullName: string;
}

/**
 * Fetches authoritative guardian data by upline_eq_id.
 * Single source of truth — bypasses denormalized guardian_name/upline_first_name/last_name.
 */
export const useGuardianProfile = (uplineEqId: string | null | undefined) => {
  const [data, setData] = useState<GuardianProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uplineEqId) {
      setData(null);
      return;
    }
    setLoading(true);
    (async () => {
      const { data: row } = await supabase
        .from('profiles')
        .select('first_name, last_name, eq_id')
        .eq('eq_id', uplineEqId)
        .maybeSingle();
      if (!active) return;
      if (row) {
        const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim();
        setData({
          firstName: row.first_name,
          lastName: row.last_name,
          eqId: row.eq_id,
          fullName,
        });
      } else {
        setData(null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [uplineEqId]);

  return { data, loading };
};
