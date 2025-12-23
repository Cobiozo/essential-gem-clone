import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PendingApprovalUser {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  eq_id: string | null;
  guardian_approved: boolean;
  admin_approved: boolean;
  created_at: string;
}

export const useGuardianApproval = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const approveUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('guardian_approve_user', {
        target_user_id: targetUserId
      });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Użytkownik został zatwierdzony. Teraz oczekuje na zatwierdzenie przez administratora.',
      });

      return true;
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zatwierdzić użytkownika.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const rejectUser = useCallback(async (targetUserId: string, reason?: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('guardian_reject_user', {
        target_user_id: targetUserId,
        rejection_reason: reason || null
      });

      if (error) throw error;

      toast({
        title: 'Odrzucono',
        description: 'Rejestracja użytkownika została odrzucona.',
      });

      return true;
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się odrzucić użytkownika.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    approveUser,
    rejectUser,
    loading,
  };
};