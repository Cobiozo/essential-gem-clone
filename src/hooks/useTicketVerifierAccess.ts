import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UseTicketVerifierAccessResult {
  canAccess: boolean;
  loading: boolean;
}

/**
 * Returns true if the current user is admin or has an explicit
 * ticket_verifier_access row with is_enabled = true.
 */
export const useTicketVerifierAccess = (): UseTicketVerifierAccessResult => {
  const { user, userRole } = useAuth();
  const [canAccess, setCanAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) { setCanAccess(false); setLoading(false); }
        return;
      }
      if (userRole?.role === 'admin') {
        if (!cancelled) { setCanAccess(true); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from('ticket_verifier_access')
        .select('is_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setCanAccess(!!data?.is_enabled);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, userRole?.role]);

  return { canAccess, loading };
};
