import { verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return auth.response;
    const { supabaseAdmin } = auth;

    const body = await req.json().catch(() => ({}));
    const eventId: string | undefined = body.event_id ?? body.eventId;
    if (!eventId) return jsonResponse({ error: "event_id is required" }, 400);

    const { data, error } = await supabaseAdmin
      .from("paid_event_orders")
      .select(
        "id, event_id, user_id, email, first_name, last_name, phone, status, email_confirmed_at, ticket_code, ticket_sent_at, checked_in, checked_in_at, created_at, ticket_id, paid_event_tickets(name)"
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("admin-list-event-orders error:", error);
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ orders: data ?? [] });
  } catch (e: any) {
    console.error("admin-list-event-orders fatal:", e);
    return jsonResponse({ error: e.message || "Internal error" }, 500);
  }
});
