import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PendingLeaderApproval {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  eq_id: string | null;
  upline_eq_id: string | null;
  upline_first_name: string | null;
  upline_last_name: string | null;
  created_at: string;
  guardian_approved_at: string | null;
}

export function useLeaderApprovals(hasApprovalPermission?: boolean) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingApprovals = [], isLoading } = useQuery({
    queryKey: ['leader-pending-approvals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_leader_approvals');
      if (error) {
        // If no permission, return empty (not an error to display)
        if (error.message?.includes('Brak uprawnień')) return [];
        throw error;
      }
      return (data || []) as PendingLeaderApproval[];
    },
    enabled: !!user && hasApprovalPermission === true,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('leader_approve_user', {
        target_user_id: targetUserId,
      });
      if (error) throw error;

      // Send approval email
      try {
        const { error: emailErr } = await supabase.functions.invoke('send-approval-email', {
          body: { userId: targetUserId, approvalType: 'leader', approverId: user?.id },
        });
        if (emailErr) {
          console.error('[LeaderApprovals] Email send failed:', emailErr);
        }
      } catch (emailErr) {
        console.error('[LeaderApprovals] Email send exception:', emailErr);
      }
    },
    onSuccess: () => {
      toast.success('Użytkownik został zatwierdzony. Konto jest teraz aktywne.');
      queryClient.invalidateQueries({ queryKey: ['leader-pending-approvals'] });
    },
    onError: (err: any) => {
      toast.error(`Błąd zatwierdzania: ${err.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ targetUserId, reason }: { targetUserId: string; reason?: string }) => {
      const { error } = await supabase.rpc('leader_reject_user', {
        target_user_id: targetUserId,
        rejection_reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rejestracja została odrzucona.');
      queryClient.invalidateQueries({ queryKey: ['leader-pending-approvals'] });
    },
    onError: (err: any) => {
      toast.error(`Błąd odrzucania: ${err.message}`);
    },
  });

  return {
    pendingApprovals,
    isLoading,
    pendingCount: pendingApprovals.length,
    approveUser: (userId: string) => approveMutation.mutate(userId),
    rejectUser: (userId: string, reason?: string) => rejectMutation.mutate({ targetUserId: userId, reason }),
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
