import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return auth.response;

    const { orderId } = await req.json();
    if (!orderId) return jsonResponse({ error: "orderId required" }, 400);

    const { error } = await auth.supabaseAdmin
      .from("paid_event_orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    if (error) return jsonResponse({ error: error.message }, 500);

    return jsonResponse({ success: true });
  } catch (e: any) {
    console.error("[admin-cancel-event-order]", e);
    return jsonResponse({ error: e.message }, 500);
  }
});
