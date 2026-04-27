import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OmegaTestReminderLogEntry {
  id: string;
  test_id: string;
  client_id: string | null;
  user_id: string;
  kind: '25d' | '120d';
  channel: 'in_app' | 'email_partner' | 'email_client';
  recipient: string | null;
  status: 'sent' | 'failed' | 'skipped';
  error: string | null;
  sent_at: string;
}

interface Params {
  testId?: string | null;
  clientId?: string | null;
  enabled?: boolean;
}

export function useOmegaTestReminderLog({ testId, clientId, enabled = true }: Params) {
  return useQuery({
    queryKey: ['omega-test-reminder-log', testId ?? null, clientId ?? null],
    enabled: enabled && (!!testId || !!clientId),
    queryFn: async () => {
      let q = (supabase as any)
        .from('omega_test_reminder_log')
        .select('*')
        .order('sent_at', { ascending: false });
      if (testId) q = q.eq('test_id', testId);
      else if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OmegaTestReminderLogEntry[];
    },
  });
}
