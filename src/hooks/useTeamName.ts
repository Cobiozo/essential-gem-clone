import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Generate team name from leader's initials or custom name.
 * Pattern: "Zespół-I.N." (e.g. "Zespół-S.S." for Sebastian Snopek)
 */
export function generateTeamName(
  firstName: string | null,
  lastName: string | null,
  customName: string | null
): string {
  if (customName) return customName;
  const fi = firstName?.charAt(0)?.toUpperCase() || '?';
  const li = lastName?.charAt(0)?.toUpperCase() || '?';
  return `Zespół-${fi}.${li}.`;
}

/**
 * Hook to get the current user's (leader's) team name.
 */
export function useMyTeamName(userId: string | undefined) {
  return useQuery<string | null>({
    queryKey: ['my-team-name', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single();

      const { data: team } = await (supabase as any)
        .from('platform_teams')
        .select('custom_name')
        .eq('leader_user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (!profile) return null;

      return generateTeamName(
        profile.first_name,
        profile.last_name,
        team?.custom_name || null
      );
    },
    enabled: !!userId,
  });
}
