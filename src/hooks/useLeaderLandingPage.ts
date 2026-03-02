import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LeaderLandingPage, LandingBlock } from '@/types/leaderLanding';

export function useLeaderLandingPage(eqId: string | null) {
  return useQuery({
    queryKey: ['leader-landing-page', eqId],
    queryFn: async (): Promise<LeaderLandingPage | null> => {
      if (!eqId) return null;

      // Cast needed until Supabase types are regenerated
      const { data, error } = await (supabase.from('leader_landing_pages') as any)
        .select('*')
        .eq('eq_id', eqId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        blocks: (data.blocks as unknown as LandingBlock[]) || [],
      } as LeaderLandingPage;
    },
    enabled: !!eqId,
    staleTime: 60 * 1000,
  });
}
