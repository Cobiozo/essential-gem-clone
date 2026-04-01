import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface OmegaTest {
  id: string;
  user_id: string;
  test_date: string;
  omega3_index: number | null;
  omega6_3_ratio: number | null;
  aa: number | null;
  epa: number | null;
  dha: number | null;
  la: number | null;
  notes: string | null;
  created_at: string;
}

export interface OmegaTestInput {
  test_date: string;
  omega3_index?: number | null;
  omega6_3_ratio?: number | null;
  aa?: number | null;
  epa?: number | null;
  dha?: number | null;
  la?: number | null;
  notes?: string | null;
}

export const useOmegaTests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['omega-tests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('omega_tests')
        .select('*')
        .order('test_date', { ascending: true });
      if (error) throw error;
      return data as OmegaTest[];
    },
    enabled: !!user,
  });

  const addTest = useMutation({
    mutationFn: async (input: OmegaTestInput) => {
      const { error } = await supabase.from('omega_tests').insert({
        user_id: user!.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omega-tests'] });
      toast({ title: 'Zapisano nowy wynik testu' });
    },
    onError: () => {
      toast({ title: 'Błąd zapisu', variant: 'destructive' });
    },
  });

  const updateTest = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & OmegaTestInput) => {
      const { error } = await supabase.from('omega_tests').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omega-tests'] });
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
      queryClient.invalidateQueries({ queryKey: ['omega-tests'] });
      toast({ title: 'Usunięto wynik testu' });
    },
  });

  const latestTest = tests.length > 0 ? tests[tests.length - 1] : null;

  return { tests, isLoading, addTest, updateTest, deleteTest, latestTest };
};
