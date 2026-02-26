import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SubLeaderInfo {
  userId: string;
  eqId: string;
  firstName: string;
  lastName: string;
  teamName: string;
  customName: string | null;
  isIndependent: boolean;
}

export function useSubTeamLeaders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subLeaders, setSubLeaders] = useState<SubLeaderInfo[]>([]);
  const [leaderUserIds, setLeaderUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchSubLeaders = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all leader user_ids
      const { data: leaders } = await supabase
        .from('leader_permissions')
        .select('user_id');

      if (!leaders || leaders.length === 0) {
        setLeaderUserIds(new Set());
        setSubLeaders([]);
        setLoading(false);
        return;
      }

      const ids = leaders.map((l) => l.user_id);
      setLeaderUserIds(new Set(ids));

      // Fetch profiles + platform_teams for all leaders
      const [profilesResult, teamsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name, eq_id')
          .in('user_id', ids),
        supabase
          .from('platform_teams')
          .select('leader_user_id, custom_name, is_independent'),
      ]);

      const profiles = profilesResult.data || [];
      const teamsMap = new Map(
        (teamsResult.data || []).map((t: any) => [t.leader_user_id, t])
      );

      const result: SubLeaderInfo[] = profiles
        .filter((p) => p.eq_id)
        .map((p) => {
          const team = teamsMap.get(p.user_id) as any;
          const defaultName = `Zespół-${(p.first_name || '?')[0]}.${(p.last_name || '?')[0]}.`;
          return {
            userId: p.user_id,
            eqId: p.eq_id!,
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            teamName: team?.custom_name || defaultName,
            customName: team?.custom_name || null,
            isIndependent: team?.is_independent || false,
          };
        });

      setSubLeaders(result);
    } catch (err) {
      console.error('Error fetching sub-leaders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubLeaders();
  }, [fetchSubLeaders]);

  const toggleIndependence = useCallback(
    async (subLeaderUserId: string, value: boolean) => {
      if (!user) return;

      try {
        // Upsert platform_teams
        const { data: existing } = await supabase
          .from('platform_teams')
          .select('id, is_independent')
          .eq('leader_user_id', subLeaderUserId)
          .maybeSingle();

        const oldValue = existing?.is_independent || false;

        if (existing) {
          await supabase
            .from('platform_teams')
            .update({ is_independent: value })
            .eq('leader_user_id', subLeaderUserId);
        } else {
          await supabase
            .from('platform_teams')
            .insert({ leader_user_id: subLeaderUserId, is_independent: value });
        }

        // Log action
        await supabase.from('platform_team_actions').insert({
          leader_user_id: user.id,
          action_type: 'toggle_independence',
          target_team_leader_id: subLeaderUserId,
          old_value: String(oldValue),
          new_value: String(value),
        });

        toast({
          title: 'Zapisano',
          description: value
            ? 'Zespół oznaczony jako niezależny'
            : 'Zespół przywrócony pod nadzór',
        });

        await fetchSubLeaders();
      } catch (err: any) {
        toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
      }
    },
    [user, fetchSubLeaders, toast]
  );

  const isLeader = useCallback(
    (userId: string) => leaderUserIds.has(userId),
    [leaderUserIds]
  );

  const getSubLeaderInfo = useCallback(
    (userId: string) => subLeaders.find((sl) => sl.userId === userId) || null,
    [subLeaders]
  );

  return {
    subLeaders,
    leaderUserIds,
    loading,
    isLeader,
    getSubLeaderInfo,
    toggleIndependence,
    refetch: fetchSubLeaders,
  };
}
