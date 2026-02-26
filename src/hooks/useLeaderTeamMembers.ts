import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
  upline_eq_id: string | null;
  role: string | null;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  level: number;
}

export function useLeaderTeamMembers() {
  const { user, profile } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leader-team-members', user?.id],
    queryFn: async () => {
      if (!profile?.eq_id) return [];

      const { data, error } = await supabase.rpc('get_organization_tree', {
        p_root_eq_id: profile.eq_id,
        p_max_depth: 10,
      });

      if (error) throw error;
      return (data || []) as TeamMember[];
    },
    enabled: !!user && !!profile?.eq_id,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  const allMembers = data || [];
  // Exclude self (level 0)
  const teamMembers = allMembers.filter(m => m.level > 0);
  const teamMemberIds = teamMembers.map(m => m.id);

  return {
    allMembers,
    teamMembers,
    teamMemberIds,
    loading: isLoading,
    error,
    refetch,
  };
}
