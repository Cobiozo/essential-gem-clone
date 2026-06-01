import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return auth.response;

    const { orderId } = await req.json();
    if (!orderId) return jsonResponse({ error: "orderId required" }, 400);

    // Load order to know event_id / user_id / email so we can also cancel
    // related rows in event_registrations + guest_event_registrations.
    // Without this a re-registration attempt would still hit the old row.
    const { data: order } = await auth.supabaseAdmin
      .from("paid_event_orders")
      .select("id, event_id, user_id, email")
      .eq("id", orderId)
      .maybeSingle();

    const { error } = await auth.supabaseAdmin
      .from("paid_event_orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    if (error) return jsonResponse({ error: error.message }, 500);

    if (order?.event_id) {
      const nowIso = new Date().toISOString();
      if (order.user_id) {
        await auth.supabaseAdmin
          .from("event_registrations")
          .update({ status: "cancelled", cancelled_at: nowIso })
          .eq("event_id", order.event_id)
          .eq("user_id", order.user_id);
      }
      if (order.email) {
        await auth.supabaseAdmin
          .from("guest_event_registrations")
          .update({ status: "cancelled", cancelled_at: nowIso })
          .eq("event_id", order.event_id)
          .eq("email", String(order.email).toLowerCase());
      }
    }

    return jsonResponse({ success: true });
  } catch (e: any) {
    console.error("[admin-cancel-event-order]", e);
    return jsonResponse({ error: e.message }, 500);
  }
});
