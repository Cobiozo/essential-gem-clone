import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface OmegaTest {
  id: string;
  user_id: string;
  client_id: string | null;
  test_date: string;
  test_handed_date: string | null;
  omega3_index: number | null;
  omega6_3_ratio: number | null;
  aa: number | null;
  epa: number | null;
  dha: number | null;
  la: number | null;
  notes: string | null;
  reminder_25d_enabled: boolean;
  reminder_120d_enabled: boolean;
  notify_partner_email: boolean;
  notify_client_email: boolean;
  reminder_25d_sent_at: string | null;
  reminder_120d_sent_at: string | null;
  created_at: string;
}

export interface OmegaTestInput {
  test_date: string;
  client_id?: string | null;
  test_handed_date?: string | null;
  omega3_index?: number | null;
  omega6_3_ratio?: number | null;
  aa?: number | null;
  epa?: number | null;
  dha?: number | null;
  la?: number | null;
  notes?: string | null;
  reminder_25d_enabled?: boolean;
  reminder_120d_enabled?: boolean;
  notify_partner_email?: boolean;
  notify_client_email?: boolean;
}

interface UseOmegaTestsOptions {
  /** 'self' = user's own tests (client_id IS NULL); 'client' = tests for a specific client */
  scope?: 'self' | 'client';
  clientId?: string | null;
}

export const useOmegaTests = (options: UseOmegaTestsOptions = {}) => {
  const { scope = 'self', clientId = null } = options;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['omega-tests', user?.id, scope, clientId];

  const { data: tests = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('omega_tests')
        .select('*')
        .order('test_date', { ascending: true });

      if (scope === 'self') {
        query = query.is('client_id', null);
      } else if (scope === 'client' && clientId) {
        query = query.eq('client_id', clientId);
      } else if (scope === 'client' && !clientId) {
        return [] as OmegaTest[];
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as OmegaTest[]) ?? [];
    },
    enabled: !!user && (scope === 'self' || !!clientId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['omega-tests'] });
    queryClient.invalidateQueries({ queryKey: ['omega-test-clients'] });
  };

  const addTest = useMutation({
    mutationFn: async (input: OmegaTestInput) => {
      const { error } = await supabase.from('omega_tests').insert({
        user_id: user!.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Zapisano nowy wynik testu' });
    },
    onError: () => {
      toast({ title: 'Błąd zapisu', variant: 'destructive' });
    },
  });

  const updateTest = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<OmegaTestInput>) => {
      const { error } = await supabase.from('omega_tests').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Zaktualizowano wynik testu' });
    },
    onError: () => {
      toast({ title: 'Błąd aktualizacji', variant: 'destructive' });
    },
  });

  const deleteTest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('omega_tests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Usunięto wynik testu' });
    },
  });

  const latestTest = tests.length > 0 ? tests[tests.length - 1] : null;

  return { tests, isLoading, addTest, updateTest, deleteTest, latestTest };
};
