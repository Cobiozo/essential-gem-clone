import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LogActionParams {
  actionType: string;
  actionDescription: string;
  targetTable?: string;
  targetId?: string;
  details?: Record<string, any>;
}

export const useAdminActivityLog = () => {
  const { user, isAdmin } = useAuth();

  const logAction = useCallback(async ({
    actionType,
    actionDescription,
    targetTable,
    targetId,
    details = {},
  }: LogActionParams) => {
    if (!user || !isAdmin) return;

    try {
      await supabase.from('admin_activity_log').insert({
        admin_user_id: user.id,
        action_type: actionType,
        action_description: actionDescription,
        target_table: targetTable || null,
        target_id: targetId || null,
        details,
      });
    } catch (err) {
      console.error('[AdminActivityLog] Failed to log action:', err);
    }
  }, [user, isAdmin]);

  return { logAction };
};
