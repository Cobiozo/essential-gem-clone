import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Logs a participant action into challenge_activity_log so the CRON supervisor
 * can verify task completion. Safe no-op when the user is not a participant.
 */
export function useChallengeAction() {
  const { user } = useAuth();

  const log = useCallback(
    async (actionType: string, payload: Record<string, unknown> = {}) => {
      if (!user?.id) return;
      try {
        const { data: p } = await supabase
          .from("challenge_participants")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        if (!p?.id) return;
        await supabase.from("challenge_activity_log").insert({
          user_id: user.id,
          participant_id: p.id,
          action_type: actionType,
          payload,
        });
      } catch (e) {
        console.warn("[useChallengeAction]", e);
      }
    },
    [user?.id],
  );

  return { log };
}
