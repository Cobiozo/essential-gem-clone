import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface LeaderTeamData {
  teamName: string;
  customName: string | null;
  isIndependent: boolean;
  memberCount: number;
}

export function useLeaderTeam() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [teamData, setTeamData] = useState<LeaderTeamData | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultName = profile
    ? `Zespół-${(profile.first_name || '?')[0]}.${(profile.last_name || '?')[0]}.`
    : 'Zespół';

  const fetchTeamData = useCallback(async () => {
    if (!user || !profile?.eq_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [teamResult, treeResult] = await Promise.all([
        supabase
          .from('platform_teams')
          .select('custom_name, is_independent')
          .eq('leader_user_id', user.id)
          .maybeSingle(),
        supabase.rpc('get_organization_tree', {
          p_root_eq_id: profile.eq_id,
          p_max_depth: 10,
        }),
      ]);

      const team = teamResult.data;
      const members = treeResult.data || [];
      // Exclude self (level 0)
      const memberCount = members.filter((m: any) => m.level > 0).length;

      setTeamData({
        teamName: team?.custom_name || defaultName,
        customName: team?.custom_name || null,
        isIndependent: team?.is_independent || false,
        memberCount,
      });
    } catch (err) {
      console.error('Error fetching leader team:', err);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.eq_id, defaultName]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const updateTeamName = useCallback(
    async (newName: string | null) => {
      if (!user) return;

      try {
        const oldName = teamData?.customName || null;

        // Upsert platform_teams
        const { data: existing } = await supabase
          .from('platform_teams')
          .select('id')
          .eq('leader_user_id', user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('platform_teams')
            .update({ custom_name: newName || null })
            .eq('leader_user_id', user.id);
        } else {
          await supabase
            .from('platform_teams')
            .insert({ leader_user_id: user.id, custom_name: newName || null });
        }

        // Log action
        await supabase.from('platform_team_actions').insert({
          leader_user_id: user.id,
          action_type: 'rename_team',
          target_team_leader_id: user.id,
          old_value: oldName || defaultName,
          new_value: newName || defaultName,
        });

        toast({ title: 'Zapisano', description: 'Nazwa zespołu została zaktualizowana' });
        await fetchTeamData();
      } catch (err: any) {
        toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
      }
    },
    [user, teamData, defaultName, fetchTeamData, toast]
  );

  return { teamData, loading, defaultName, updateTeamName, refetch: fetchTeamData };
}
