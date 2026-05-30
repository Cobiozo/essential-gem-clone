import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PayUStatus {
  payuReady: boolean;
  isEnabled: boolean;
  lastTestOk: boolean | null;
  lastTestAt: string | null;
  reason: string | null;
}

/**
 * Public PayU status — readable by anon/authenticated via SECURITY DEFINER RPC.
 * Returns whether PayU is actually usable for live payments (enabled + last test passed).
 */
export function usePayUStatus() {
  const query = useQuery({
    queryKey: ['payu-public-status'],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<PayUStatus> => {
      const { data, error } = await (supabase as any).rpc('get_payu_public_status');
      if (error) {
        return {
          payuReady: false,
          isEnabled: false,
          lastTestOk: null,
          lastTestAt: null,
          reason: 'Nie można sprawdzić statusu PayU',
        };
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return {
          payuReady: false,
          isEnabled: false,
          lastTestOk: null,
          lastTestAt: null,
          reason: 'PayU nie jest skonfigurowane',
        };
      }
      const isEnabled = !!row.is_enabled;
      const lastTestOk = row.last_test_ok === null ? null : !!row.last_test_ok;
      const lastTestAt = row.last_test_at ?? null;
      let reason: string | null = null;
      if (!isEnabled) reason = 'PayU jest wyłączone w panelu administratora';
      else if (lastTestOk === null) reason = 'Brak testu połączenia PayU';
      else if (lastTestOk === false) reason = 'Ostatni test połączenia PayU nie powiódł się';
      return {
        payuReady: isEnabled && lastTestOk === true,
        isEnabled,
        lastTestOk,
        lastTestAt,
        reason,
      };
    },
  });

  return {
    payuReady: query.data?.payuReady ?? false,
    isEnabled: query.data?.isEnabled ?? false,
    lastTestOk: query.data?.lastTestOk ?? null,
    lastTestAt: query.data?.lastTestAt ?? null,
    reason: query.data?.reason ?? null,
    loading: query.isLoading,
  };
}
