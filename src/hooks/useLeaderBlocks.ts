import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserBlock {
  id: string;
  blocked_user_id: string;
  blocked_by_user_id: string | null;
  blocked_by_first_name: string | null;
  blocked_by_last_name: string | null;
  reason: string | null;
  blocked_at: string;
  unblocked_at: string | null;
  unblocked_by_user_id: string | null;
  is_active: boolean;
  // Joined profile data
  blocked_first_name?: string;
  blocked_last_name?: string;
  blocked_email?: string;
  blocked_eq_id?: string;
  blocked_role?: string;
}

export function useLeaderBlocks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['leader-blocks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) return [];

      // Fetch profile data for blocked users
      const userIds = data.map(b => b.blocked_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, eq_id, role')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(block => {
        const profile = profileMap.get(block.blocked_user_id);
        return {
          ...block,
          blocked_first_name: profile?.first_name || null,
          blocked_last_name: profile?.last_name || null,
          blocked_email: profile?.email || null,
          blocked_eq_id: profile?.eq_id || null,
          blocked_role: profile?.role || null,
        } as UserBlock;
      });
    },
    enabled: !!user,
  });

  const blockUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('leader_block_user', {
        p_target_user_id: userId,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Użytkownik zablokowany', description: 'Dostęp został zablokowany.' });
      queryClient.invalidateQueries({ queryKey: ['leader-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['organization-tree'] });
    },
    onError: (error: any) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const unblockUser = useMutation({
    mutationFn: async (blockId: string) => {
      const { data, error } = await supabase.rpc('leader_unblock_user', {
        p_block_id: blockId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Użytkownik odblokowany', description: 'Dostęp został przywrócony.' });
      queryClient.invalidateQueries({ queryKey: ['leader-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['organization-tree'] });
    },
    onError: (error: any) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  return {
    blocks,
    loading: isLoading,
    blockUser,
    unblockUser,
  };
}
