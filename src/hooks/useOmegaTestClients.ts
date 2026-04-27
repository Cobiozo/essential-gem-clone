import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface OmegaTestClient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OmegaTestClientInput {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface OmegaTestClientWithStats extends OmegaTestClient {
  tests_count: number;
  last_test_date: string | null;
  next_reminder_date: string | null;
  next_reminder_kind: '25d' | '120d' | null;
}

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const useOmegaTestClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['omega-test-clients', user?.id],
    queryFn: async () => {
      const { data: clientRows, error } = await supabase
        .from('omega_test_clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: testRows, error: testErr } = await supabase
        .from('omega_tests')
        .select('client_id, test_date, reminder_25d_enabled, reminder_25d_sent_at, reminder_120d_enabled, reminder_120d_sent_at')
        .not('client_id', 'is', null);
      if (testErr) throw testErr;

      const today = new Date().toISOString().slice(0, 10);

      const enriched: OmegaTestClientWithStats[] = (clientRows ?? []).map((c) => {
        const myTests = (testRows ?? []).filter((t: any) => t.client_id === c.id);
        const testsCount = myTests.length;
        const lastTestDate = myTests
          .map((t: any) => t.test_date as string)
          .sort()
          .pop() ?? null;

        // Find earliest upcoming pending reminder across all tests
        let bestDate: string | null = null;
        let bestKind: '25d' | '120d' | null = null;
        for (const t of myTests as any[]) {
          if (t.reminder_25d_enabled && !t.reminder_25d_sent_at) {
            const d = addDays(t.test_date, 25);
            if (d >= today && (!bestDate || d < bestDate)) {
              bestDate = d;
              bestKind = '25d';
            }
          }
          if (t.reminder_120d_enabled && !t.reminder_120d_sent_at) {
            const d = addDays(t.test_date, 120);
            if (d >= today && (!bestDate || d < bestDate)) {
              bestDate = d;
              bestKind = '120d';
            }
          }
        }

        return {
          ...(c as OmegaTestClient),
          tests_count: testsCount,
          last_test_date: lastTestDate,
          next_reminder_date: bestDate,
          next_reminder_kind: bestKind,
        };
      });

      return enriched;
    },
    enabled: !!user,
  });

  const addClient = useMutation({
    mutationFn: async (input: OmegaTestClientInput) => {
      const { data, error } = await supabase
        .from('omega_test_clients')
        .insert({ user_id: user!.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as OmegaTestClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omega-test-clients'] });
      toast({ title: 'Dodano klienta' });
    },
    onError: () => toast({ title: 'Błąd dodawania klienta', variant: 'destructive' }),
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<OmegaTestClientInput>) => {
      const { error } = await supabase.from('omega_test_clients').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omega-test-clients'] });
      toast({ title: 'Zaktualizowano dane klienta' });
    },
    onError: () => toast({ title: 'Błąd aktualizacji', variant: 'destructive' }),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('omega_test_clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omega-test-clients'] });
      queryClient.invalidateQueries({ queryKey: ['omega-tests'] });
      toast({ title: 'Usunięto klienta' });
    },
  });

  return { clients, isLoading, addClient, updateClient, deleteClient };
};
