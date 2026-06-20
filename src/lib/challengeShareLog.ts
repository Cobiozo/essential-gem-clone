import { supabase } from "@/integrations/supabase/client";

/**
 * Log a verified resource share to challenge_activity_log so the
 * challenge supervisor can count unique recipients per resource.
 * Safe no-op if user is not an active challenge participant.
 */
export async function logShareSend(args: {
  resourceId: string;
  recipientId: string;
  channel?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: participant } = await supabase
      .from("challenge_participants")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!participant?.id) return;

    await (supabase.from("challenge_activity_log") as any).insert({
      participant_id: participant.id,
      action_type: "share_send",
      payload: {
        resource_id: args.resourceId,
        recipient_id: args.recipientId,
        channel: args.channel ?? "manual",
      },
    });

    // Fire-and-forget ad-hoc verification — no need to wait
    supabase.functions
      .invoke("challenge-daily-supervisor", {
        body: { participant_id: participant.id },
      })
      .catch(() => {});
  } catch (e) {
    console.warn("[challengeShareLog] failed", e);
  }
}
