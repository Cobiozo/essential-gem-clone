import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  eq_id: string;
  upline_eq_id: string;
  role: string;
  avatar_url: string | null;
  email: string;
  phone_number: string | null;
  level: number;
}

export interface SubTeam {
  leaderUserId: string;
  leaderName: string;
  leaderEqId: string;
  teamName: string;
  customName: string | null;
  isIndependent: boolean;
  members: TeamMember[];
  memberCount: number;
}

export interface PlatformTeam {
  leaderUserId: string;
  leaderFirstName: string;
  leaderLastName: string;
  leaderEqId: string;
  leaderAvatarUrl: string | null;
  teamName: string;
  customName: string | null;
  isIndependent: boolean;
  directMembers: TeamMember[];
  subTeams: SubTeam[];
  totalMemberCount: number;
}

export function usePlatformTeams() {
  const [teams, setTeams] = useState<PlatformTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get all leaders from leader_permissions
      const { data: leaders, error: leadersError } = await supabase
        .from('leader_permissions')
        .select('user_id');

      if (leadersError) throw leadersError;
      if (!leaders || leaders.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      const leaderUserIds = leaders.map((l) => l.user_id);

      // 2. Get profiles for all leaders
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, eq_id, avatar_url')
        .in('user_id', leaderUserIds);

      if (profilesError) throw profilesError;

      // 3. Get platform_teams settings
      const { data: teamSettings, error: settingsError } = await supabase
        .from('platform_teams')
        .select('*');

      if (settingsError) throw settingsError;

      const settingsMap = new Map(
        (teamSettings || []).map((s: any) => [s.leader_user_id, s])
      );

      // 4. For each leader, get their organization tree
      const leaderProfiles = (profiles || []).filter((p) => p.eq_id);
      const treeResults = await Promise.all(
        leaderProfiles.map(async (profile) => {
          const { data, error } = await supabase.rpc('get_organization_tree', {
            p_root_eq_id: profile.eq_id!,
            p_max_depth: 10,
          });
          return { profile, members: error ? [] : (data as TeamMember[]) || [] };
        })
      );

      // 5. Build leader eq_id set for sub-team detection
      const leaderEqIds = new Set(leaderProfiles.map((p) => p.eq_id!));

      // 6. Build teams with sub-team detection
      const allTeams: PlatformTeam[] = treeResults.map(({ profile, members }) => {
        const settings = settingsMap.get(profile.user_id) as any;
        const customName = settings?.custom_name || null;
        const isIndependent = settings?.is_independent || false;

        const defaultName = `Zespół-${(profile.first_name || '?')[0]}.${(profile.last_name || '?')[0]}.`;

        // Find sub-leaders in this tree (excluding root leader)
        const subLeaderEqIds = members
          .filter((m) => m.level > 0 && leaderEqIds.has(m.eq_id))
          .map((m) => m.eq_id);

        // For each sub-leader, find their sub-tree members
        const subTeams: SubTeam[] = [];
        const subTeamMemberEqIds = new Set<string>();

        for (const subEqId of subLeaderEqIds) {
          const subLeaderResult = treeResults.find(
            (tr) => tr.profile.eq_id === subEqId
          );
          if (!subLeaderResult) continue;

          const subSettings = settingsMap.get(subLeaderResult.profile.user_id) as any;
          const subIsIndependent = subSettings?.is_independent || false;

          // If independent, skip as sub-team (will appear as top-level)
          if (subIsIndependent) {
            // Mark all sub-team members to exclude from parent
            subLeaderResult.members.forEach((m) =>
              subTeamMemberEqIds.add(m.eq_id)
            );
            continue;
          }

          const subCustomName = subSettings?.custom_name || null;
          const subDefaultName = `Zespół-${(subLeaderResult.profile.first_name || '?')[0]}.${(subLeaderResult.profile.last_name || '?')[0]}.`;

          // Sub-team members (level > 0 from sub-leader's tree, excluding further sub-leaders' trees)
          const subMembers = subLeaderResult.members.filter((m) => m.level > 0);

          subTeams.push({
            leaderUserId: subLeaderResult.profile.user_id,
            leaderName: `${subLeaderResult.profile.first_name} ${subLeaderResult.profile.last_name}`,
            leaderEqId: subEqId,
            teamName: subCustomName || subDefaultName,
            customName: subCustomName,
            isIndependent: subIsIndependent,
            members: subMembers,
            memberCount: subMembers.length,
          });

          // Mark sub-team members to show they belong to a sub-team
          subLeaderResult.members.forEach((m) =>
            subTeamMemberEqIds.add(m.eq_id)
          );
        }

        // Direct members = tree members excluding leader themselves and sub-team members
        const directMembers = members.filter(
          (m) => m.level > 0 && !subTeamMemberEqIds.has(m.eq_id)
        );

        const subTeamTotalMembers = subTeams.reduce(
          (sum, st) => sum + st.memberCount + 1, // +1 for sub-leader
          0
        );

        return {
          leaderUserId: profile.user_id,
          leaderFirstName: profile.first_name || '',
          leaderLastName: profile.last_name || '',
          leaderEqId: profile.eq_id!,
          leaderAvatarUrl: profile.avatar_url || null,
          teamName: customName || defaultName,
          customName,
          isIndependent,
          directMembers,
          subTeams,
          totalMemberCount: directMembers.length + subTeamTotalMembers,
        };
      });

      // Sort: non-independent first, then by member count desc
      allTeams.sort((a, b) => {
        if (a.isIndependent !== b.isIndependent) return a.isIndependent ? 1 : -1;
        return b.totalMemberCount - a.totalMemberCount;
      });

      setTeams(allTeams);
    } catch (err: any) {
      console.error('Error fetching platform teams:', err);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać danych zespołów',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const updateTeamName = useCallback(
    async (leaderUserId: string, newName: string | null) => {
      try {
        const { data: existing } = await supabase
          .from('platform_teams')
          .select('id')
          .eq('leader_user_id', leaderUserId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('platform_teams')
            .update({ custom_name: newName || null })
            .eq('leader_user_id', leaderUserId);
        } else {
          await supabase
            .from('platform_teams')
            .insert({ leader_user_id: leaderUserId, custom_name: newName || null });
        }

        toast({ title: 'Zapisano', description: 'Nazwa zespołu została zaktualizowana' });
        await fetchTeams();
      } catch (err: any) {
        toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
      }
    },
    [fetchTeams, toast]
  );

  const toggleIndependence = useCallback(
    async (leaderUserId: string, isIndependent: boolean) => {
      try {
        const { data: existing } = await supabase
          .from('platform_teams')
          .select('id')
          .eq('leader_user_id', leaderUserId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('platform_teams')
            .update({ is_independent: isIndependent })
            .eq('leader_user_id', leaderUserId);
        } else {
          await supabase
            .from('platform_teams')
            .insert({ leader_user_id: leaderUserId, is_independent: isIndependent });
        }

        toast({
          title: 'Zapisano',
          description: isIndependent
            ? 'Zespół oznaczony jako niezależny'
            : 'Zespół przywrócony pod nadzór lidera wyżej',
        });
        await fetchTeams();
      } catch (err: any) {
        toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
      }
    },
    [fetchTeams, toast]
  );

  return { teams, loading, refetch: fetchTeams, updateTeamName, toggleIndependence };
}
