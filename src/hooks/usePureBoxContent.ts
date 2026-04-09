import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ASSESSMENT_STEPS, type AssessmentStepData } from '@/components/skills-assessment/assessmentData';
import { useToast } from '@/hooks/use-toast';

// Milestones default
export const DEFAULT_MILESTONES = [
  { month: 0, days: 0, label: 'Miesiąc 0', title: 'Test 1 — Punkt Wyjścia', description: 'Stan Zapalny', icon: 'FlaskConical' },
  { month: 1, days: 30, label: 'Miesiąc 1', title: 'Adaptacja', description: 'Początek zmian w osoczu', icon: null },
  { month: 3, days: 90, label: 'Miesiąc 3', title: 'Połowa cyklu', description: 'Wymiana ~50% krwinek', icon: null },
  { month: 5, days: 150, label: 'Miesiąc 5', title: 'Test 2 — Weryfikacja', description: 'Wymiana Krwinek (120+ dni)', icon: 'CheckCircle2' },
  { month: 6, days: 180, label: 'Miesiąc 6', title: 'Pełna optymalizacja', description: 'Protokół zakończony', icon: null },
];

export const DEFAULT_OMEGA_THRESHOLDS = {
  ratio: {
    optimal: { max: 3.0, label: 'Optymalny', color: 'text-green-400' },
    improving: { max: 5.0, label: 'W poprawie', color: 'text-yellow-400' },
    critical: { label: 'Krytyczny', color: 'text-red-400' },
  },
  index: {
    optimal: { min: 8.0, label: 'Optymalny', color: 'text-green-400' },
    improving: { min: 4.0, label: 'W poprawie', color: 'text-yellow-400' },
    critical: { label: 'Krytyczny', color: 'text-red-400' },
  },
};

type ContentKey = 'assessment_steps' | 'omega_milestones' | 'omega_thresholds';

async function fetchContent(key: ContentKey) {
  const { data, error } = await supabase
    .from('purebox_content' as any)
    .select('content_data')
    .eq('content_key', key)
    .maybeSingle();
  if (error) throw error;
  return (data as any)?.content_data ?? null;
}

export function useAssessmentSteps(): { steps: AssessmentStepData[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['purebox-content', 'assessment_steps'],
    queryFn: () => fetchContent('assessment_steps'),
    staleTime: 5 * 60 * 1000,
  });
  return { steps: data ?? ASSESSMENT_STEPS, isLoading };
}

export function useOmegaMilestones() {
  const { data, isLoading } = useQuery({
    queryKey: ['purebox-content', 'omega_milestones'],
    queryFn: () => fetchContent('omega_milestones'),
    staleTime: 5 * 60 * 1000,
  });
  return { milestones: data ?? DEFAULT_MILESTONES, isLoading };
}

export function useOmegaThresholds() {
  const { data, isLoading } = useQuery({
    queryKey: ['purebox-content', 'omega_thresholds'],
    queryFn: () => fetchContent('omega_thresholds'),
    staleTime: 5 * 60 * 1000,
  });
  return { thresholds: data ?? DEFAULT_OMEGA_THRESHOLDS, isLoading };
}

export function useSavePureBoxContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ key, data }: { key: ContentKey; data: any }) => {
      const { data: existing } = await supabase
        .from('purebox_content' as any)
        .select('id')
        .eq('content_key', key)
        .maybeSingle();

      if ((existing as any)?.id) {
        const { error } = await supabase
          .from('purebox_content' as any)
          .update({ content_data: data, updated_by: (await supabase.auth.getUser()).data.user?.id } as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('purebox_content' as any)
          .insert({ content_key: key, content_data: data, updated_by: (await supabase.auth.getUser()).data.user?.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['purebox-content', key] });
      toast({ title: 'Zapisano', description: 'Treść została zaktualizowana.' });
    },
    onError: (err: any) => {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    },
  });
}
