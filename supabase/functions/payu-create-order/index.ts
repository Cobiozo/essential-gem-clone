// Edge function: payu-create-order
// Refactored to read credentials from public.payu_settings (via shared helper).
// Two modes:
//   1) { orderId } — use existing order created by create-event-order (preferred from /checkout page)
//   2) Legacy: { eventId, ticketId, buyer, quantity, attendees, ... } — creates order then initiates PayU.
// Returns { success, orderId, redirectUri }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPayUConfig, getPayUAccessToken } from "../_shared/payu-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BuyerData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface AttendeeInput {
  firstName: string;
  lastName: string;
  email?: string | null;
}

interface OrderRequest {
  orderId?: string;
  eventId?: string;
  ticketId?: string;
  quantity?: number;
  buyer?: BuyerData;
  attendees?: AttendeeInput[];
  refCode?: string | null;
  buyerIsAttendee?: boolean;
}

const APP_URL = "https://purelife.lovable.app";

function generateTicketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body: OrderRequest = await req.json();

    // --- Load PayU config (fail-fast if not configured) ---
    let cfg;
    try {
      cfg = await getPayUConfig();
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Płatności PayU nie są skonfigurowane. Skontaktuj się z administratorem.",
          detail: err instanceof Error ? err.message : String(err),
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Mode 1: existing orderId ---
    let order: any;
    let event: any;
    let ticket: any;
    let buyer: BuyerData;
    let quantity: number;

    if (body.orderId) {
      const { data: existing, error: oErr } = await supabase
        .from("paid_event_orders")
        .select(`*, paid_events (id, title, slug, event_date, location, is_online), paid_event_tickets (id, name, price_pln)`)
        .eq("id", body.orderId)
        .maybeSingle();
      if (oErr || !existing) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existing.status === "paid" || existing.status === "completed") {
        return new Response(JSON.stringify({ error: "Order already paid" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      order = existing;
      event = (existing as any).paid_events;
      ticket = (existing as any).paid_event_tickets;
      buyer = {
        email: existing.email,
        firstName: existing.first_name,
        lastName: existing.last_name,
        phone: existing.phone || "",
      };
      quantity = existing.quantity;
    } else {
      // --- Mode 2: legacy inline creation ---
      if (!body.eventId || !body.ticketId || !body.buyer?.email) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      buyer = body.buyer;
      quantity = Math.max(1, Math.min(50, Number(body.quantity) || 1));

      const { data: t, error: tErr } = await supabase
        .from("paid_event_tickets")
        .select(`*, paid_events ( id, title, slug, event_date, location, is_online )`)
        .eq("id", body.ticketId)
        .eq("event_id", body.eventId)
        .eq("is_active", true)
        .single();
      if (tErr || !t) {
        return new Response(JSON.stringify({ error: "Ticket not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      ticket = t;
      event = (t as any).paid_events;
      const totalAmount = t.price_pln * quantity;
      const ticketCode = generateTicketCode();
      const seatsPerTicket = Math.max(1, Number((t as any).seats_per_ticket) || 1);
      const totalSeats = quantity * seatsPerTicket;

      const { data: created, error: cErr } = await supabase
        .from("paid_event_orders")
        .insert({
          event_id: body.eventId,
          ticket_id: body.ticketId,
          email: buyer.email,
          first_name: buyer.firstName,
          last_name: buyer.lastName,
          phone: buyer.phone,
          quantity,
          total_amount: totalAmount,
          status: "pending",
          payment_provider: "payu",
          payment_method: "payu",
          ticket_code: ticketCode,
        })
        .select()
        .single();
      if (cErr || !created) {
        return new Response(JSON.stringify({ error: "Failed to create order", detail: cErr?.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      order = created;

      // attendees (best-effort)
      const incoming = Array.isArray(body.attendees) ? body.attendees : [];
      const rows: any[] = [];
      for (let i = 0; i < totalSeats; i++) {
        const a = incoming[i];
        const isBuyerSeat = i === 0 && body.buyerIsAttendee !== false;
        rows.push({
          order_id: order.id,
          event_id: body.eventId,
          seat_index: i + 1,
          first_name: a?.firstName?.trim() || (isBuyerSeat ? buyer.firstName : "Gość"),
          last_name: a?.lastName?.trim() || (isBuyerSeat ? buyer.lastName : `#${i + 1}`),
          email: a?.email?.trim() || (isBuyerSeat ? buyer.email : null),
          ticket_code: generateTicketCode(),
        });
      }
      await supabase.from("paid_event_order_attendees").insert(rows);
    }

    // --- Call PayU API ---
    const accessToken = await getPayUAccessToken(cfg);
    const customerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const payuOrder = {
      notifyUrl: `${supabaseUrl}/functions/v1/payu-webhook`,
      continueUrl: `${APP_URL}/ticket/${order.ticket_code}?orderId=${order.id}`,
      customerIp,
      merchantPosId: cfg.posId,
      description: `${event.title} - ${ticket.name}`,
      currencyCode: "PLN",
      totalAmount: String(order.total_amount),
      extOrderId: order.id,
      buyer: {
        email: buyer.email,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        phone: buyer.phone || "",
      },
      products: [
        { name: `${ticket.name} - ${event.title}`, unitPrice: String(ticket.price_pln), quantity: String(quantity) },
      ],
    };

    const payuResponse = await fetch(`${cfg.baseUrl}/api/v2_1/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payuOrder),
      redirect: "manual",
    });
    const payuData = await payuResponse.json().catch(() => ({}));

    if (payuData?.status?.statusCode !== "SUCCESS") {
      console.error("[payu-create-order] PayU rejected:", JSON.stringify(payuData));
      await supabase.from("paid_event_orders").update({ status: "failed" }).eq("id", order.id);
      return new Response(
        JSON.stringify({ error: "Inicjalizacja płatności nie powiodła się", detail: payuData?.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase
      .from("paid_event_orders")
      .update({ payment_order_id: payuData.orderId, payment_method: "payu" })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ success: true, orderId: order.id, redirectUri: payuData.redirectUri }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[payu-create-order] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
