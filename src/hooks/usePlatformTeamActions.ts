import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamAction {
  id: string;
  leaderUserId: string;
  leaderName: string;
  actionType: string;
  targetLeaderId: string | null;
  targetLeaderName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export function usePlatformTeamActions(limit = 50) {
  const [actions, setActions] = useState<TeamAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchActions = useCallback(
    async (currentOffset = 0, append = false) => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('platform_team_actions')
          .select('*')
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + limit - 1);

        if (error) throw error;

        if (!data || data.length === 0) {
          if (!append) setActions([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        // Collect unique user_ids for profiles
        const userIds = new Set<string>();
        data.forEach((a: any) => {
          userIds.add(a.leader_user_id);
          if (a.target_team_leader_id) userIds.add(a.target_team_leader_id);
        });

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', Array.from(userIds));

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim()])
        );

        const mapped: TeamAction[] = data.map((a: any) => ({
          id: a.id,
          leaderUserId: a.leader_user_id,
          leaderName: profileMap.get(a.leader_user_id) || 'Nieznany',
          actionType: a.action_type,
          targetLeaderId: a.target_team_leader_id,
          targetLeaderName: a.target_team_leader_id
            ? profileMap.get(a.target_team_leader_id) || 'Nieznany'
            : null,
          oldValue: a.old_value,
          newValue: a.new_value,
          createdAt: a.created_at,
        }));

        setActions((prev) => (append ? [...prev, ...mapped] : mapped));
        setHasMore(data.length === limit);
      } catch (err) {
        console.error('Error fetching team actions:', err);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchActions(0);
  }, [fetchActions]);

  const loadMore = useCallback(() => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchActions(newOffset, true);
  }, [offset, limit, fetchActions]);

  return { actions, loading, hasMore, loadMore, refetch: () => fetchActions(0) };
}
