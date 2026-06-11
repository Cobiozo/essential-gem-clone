// re-deploy: pick up updated verifyTicketVerifier in _shared/admin-auth.ts
import { verifyTicketVerifier as verifyAdmin, corsHeaders, jsonResponse } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[admin-list-event-orders] request received", {
      method: req.method,
      hasAuth: !!req.headers.get("Authorization"),
    });

    const auth = await verifyAdmin(req);
    if (!auth.ok) {
      console.warn("[admin-list-event-orders] auth failed -> returning", auth.response.status);
      return auth.response;
    }
    const { supabaseAdmin, userId } = auth;
    console.log("[admin-list-event-orders] admin verified", { userId });

    const body = await req.json().catch(() => ({}));
    const eventId: string | undefined = body.event_id ?? body.eventId;
    if (!eventId) return jsonResponse({ error: "event_id is required", code: "missing_event_id" }, 400);

    // 1) Orders — exclude rows owned by deleted/anonymized accounts. Historical
    // data is preserved in the DB but must NEVER appear in active admin views,
    // so a new account registering with the same email is fully isolated.
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from("paid_event_orders")
      .select(
        "id, event_id, user_id, email, first_name, last_name, phone, status, email_confirmed_at, ticket_code, ticket_sent_at, checked_in, checked_in_at, created_at, ticket_id, account_deleted_at"
      )
      .eq("event_id", eventId)
      .is("account_deleted_at", null)
      .order("created_at", { ascending: false });

    if (ordersErr) {
      console.error("[admin-list-event-orders] orders query failed:", {
        message: ordersErr.message,
        code: (ordersErr as any).code,
        details: (ordersErr as any).details,
        hint: (ordersErr as any).hint,
      });
      return jsonResponse({ error: ordersErr.message, code: "orders_query_failed" }, 500);
    }

    const ordersList = (orders ?? []) as any[];
    console.log("[admin-list-event-orders] orders fetched", { count: ordersList.length });
    const orderIds = ordersList.map((o) => o.id);
    const ticketIds = Array.from(
      new Set(ordersList.map((o) => o.ticket_id).filter(Boolean))
    ) as string[];

    // 2) Attendees
    let attendees: any[] = [];
    if (orderIds.length > 0) {
      const { data: att, error: attErr } = await supabaseAdmin
        .from("paid_event_order_attendees")
        .select(
          "id, order_id, seat_index, first_name, last_name, email, ticket_code, checked_in, checked_in_at"
        )
        .in("order_id", orderIds);
      if (attErr) {
        console.error("[admin-list-event-orders] attendees query failed:", {
          message: attErr.message,
          code: (attErr as any).code,
          details: (attErr as any).details,
          hint: (attErr as any).hint,
        });
      } else {
        attendees = att ?? [];
      }
    }

    // 3) Ticket names
    const ticketsById: Record<string, { name: string | null }> = {};
    if (ticketIds.length > 0) {
      const { data: tickets, error: tErr } = await supabaseAdmin
        .from("paid_event_tickets")
        .select("id, name")
        .in("id", ticketIds);
      if (tErr) {
        console.error("[admin-list-event-orders] tickets query failed:", {
          message: tErr.message,
          code: (tErr as any).code,
        });
      } else {
        (tickets ?? []).forEach((t: any) => {
          ticketsById[t.id] = { name: t.name };
        });
      }
    }

    // 4) Merge
    const attendeesByOrder: Record<string, any[]> = {};
    attendees.forEach((a) => {
      (attendeesByOrder[a.order_id] ||= []).push(a);
    });

    const merged = ordersList.map((o) => ({
      ...o,
      paid_event_tickets: o.ticket_id ? ticketsById[o.ticket_id] ?? null : null,
      paid_event_order_attendees: attendeesByOrder[o.id] ?? [],
    }));

    console.log("[admin-list-event-orders] returning", { orders: merged.length, attendees: attendees.length });
    return jsonResponse({ orders: merged });
  } catch (e: any) {
    console.error("[admin-list-event-orders] fatal:", e?.message, e?.stack);
    return jsonResponse({ error: e?.message || "Internal error", code: "fatal" }, 500);
  }
});
