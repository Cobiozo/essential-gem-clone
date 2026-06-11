// Edge function: create-event-order
// Unified order creator. Creates a pending order + attendee rows.
// Frontend then redirects to /checkout/{orderId} where the user picks the payment method.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Buyer { email: string; firstName: string; lastName: string; phone: string }
interface Attendee { firstName: string; lastName: string; email?: string | null }

function ticketCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = ""; for (let i = 0; i < 12; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
  return c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Best-effort: identify the logged-in buyer so we can (a) attach user_id
    // to the order and (b) catch duplicates that come from a different e-mail.
    let currentUserId: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
      if (authHeader?.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice(7).trim();
        const supabaseAuth = createClient(
          Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
        );
        const { data: userData } = await supabaseAuth.auth.getUser(token);
        currentUserId = userData?.user?.id || null;
      }
    } catch { /* ignore */ }

    const body = await req.json();
    const { eventId, ticketId, buyer, attendees = [], buyerIsAttendee = true, refCode = null, quantity = 1 } = body as {
      eventId: string; ticketId: string; buyer: Buyer; attendees?: Attendee[];
      buyerIsAttendee?: boolean; refCode?: string | null; quantity?: number;
    };
    if (!eventId || !ticketId || !buyer?.email || !buyer.firstName || !buyer.lastName) {
      return new Response(JSON.stringify({ error: "Brak wymaganych danych kupującego" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qty = Math.max(1, Math.min(50, Number(quantity) || 1));

    // When quantity > 1, every additional attendee must have full identifying data (imię, nazwisko, email).
    // Buyer takes seat #1 when buyerIsAttendee, so additional attendees start at index 1.
    if (qty > 1) {
      const emailRe = /^\S+@\S+\.\S+$/;
      const startIdx = buyerIsAttendee ? 1 : 0;
      for (let i = startIdx; i < attendees.length; i++) {
        const a = attendees[i] || ({} as Attendee);
        const firstName = (a.firstName || "").trim();
        const lastName = (a.lastName || "").trim();
        const email = (a.email || "").trim();
        if (!firstName || !lastName || !email || !emailRe.test(email)) {
          return new Response(JSON.stringify({
            error: `Brak wymaganych danych uczestnika #${i + 1} (imię, nazwisko, email)`,
          }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    const { data: ticket, error: tErr } = await supabase
      .from("paid_event_tickets")
      .select("id, name, price_pln, seats_per_ticket, is_active, quantity_available, quantity_sold, sale_start, sale_end, payment_method")
      .eq("id", ticketId).eq("event_id", eventId).maybeSingle();
    if (tErr || !ticket || !ticket.is_active) {
      return new Response(JSON.stringify({ error: "Bilet niedostępny" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((ticket as any).payment_method === 'free') {
      return new Response(JSON.stringify({ error: "Ten bilet jest bezpłatny — użyj formularza rezerwacji." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const now = new Date();
    if (ticket.sale_start && new Date(ticket.sale_start) > now) {
      return new Response(JSON.stringify({ error: "Sprzedaż jeszcze nie rozpoczęta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ticket.sale_end && new Date(ticket.sale_end) < now) {
      return new Response(JSON.stringify({ error: "Sprzedaż zakończona" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const avail = (ticket.quantity_available ?? 0) - (ticket.quantity_sold ?? 0);
    if (ticket.quantity_available != null && avail < qty) {
      return new Response(JSON.stringify({ error: "Za mało dostępnych biletów" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seatsPerTicket = Math.max(1, Number(ticket.seats_per_ticket) || 1);
    const totalSeats = qty * seatsPerTicket;
    const totalAmount = ticket.price_pln * qty;
    const code = ticketCode();

    // Duplicate guard: a logged-in user can hold only ONE reservation as a
    // participant for the same event. We also block ANY attendee e-mail that
    // already has an active ticket/registration for this event.
    const buyerEmailLc = (buyer.email || "").trim().toLowerCase();
    const attendeeEmails = (attendees || [])
      .map((a) => (a?.email || "").trim().toLowerCase())
      .filter(Boolean);
    const emailsToCheck = Array.from(new Set([buyerEmailLc, ...attendeeEmails].filter(Boolean)));
    const ACTIVE_ORDER_STATUSES = ["pending", "awaiting_email_confirmation", "awaiting_transfer", "paid", "confirmed", "completed"];

    if (emailsToCheck.length > 0 || currentUserId) {
      // 1) orders by email or user_id
      const orderFilters: string[] = [];
      if (currentUserId) orderFilters.push(`user_id.eq.${currentUserId}`);
      for (const e of emailsToCheck) orderFilters.push(`email.eq.${e}`);
      const { data: dupOrders } = await supabase
        .from("paid_event_orders")
        .select("id, email, user_id")
        .eq("event_id", eventId)
        .is("account_deleted_at", null)
        .or(orderFilters.join(","))
        .in("status", ACTIVE_ORDER_STATUSES)
        .limit(1);
      if (dupOrders && dupOrders.length > 0) {
        const dup = dupOrders[0] as any;
        const who = currentUserId && dup.user_id === currentUserId
          ? "Masz już aktywną rezerwację na to wydarzenie."
          : `Adres ${dup.email} ma już aktywną rezerwację na to wydarzenie.`;
        return new Response(JSON.stringify({
          error: "already_registered",
          message: `${who} Każdy użytkownik może zarezerwować bilet tylko raz.`,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 2) attendee seats by email (group tickets)
      if (emailsToCheck.length > 0) {
        const { data: dupSeats } = await supabase
          .from("paid_event_order_attendees")
          .select("id, email, order_id, paid_event_orders!inner(event_id, status, account_deleted_at)")
          .eq("paid_event_orders.event_id", eventId)
          .is("paid_event_orders.account_deleted_at", null)
          .is("account_deleted_at", null)
          .in("paid_event_orders.status", ACTIVE_ORDER_STATUSES)
          .in("email", emailsToCheck)
          .limit(1);
        if (dupSeats && dupSeats.length > 0) {
          const dup = dupSeats[0] as any;
          return new Response(JSON.stringify({
            error: "already_registered",
            message: `Adres ${dup.email} jest już zarejestrowany jako uczestnik na to wydarzenie. Każdy uczestnik może mieć tylko jedną rezerwację.`,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // 3) free form submissions
      if (emailsToCheck.length > 0) {
        const { data: dupSubs } = await supabase
          .from("event_form_submissions")
          .select("id, email")
          .eq("event_id", eventId)
          .in("email", emailsToCheck)
          .eq("status", "active")
          .limit(1);
        if (dupSubs && dupSubs.length > 0) {
          const dup = dupSubs[0] as any;
          return new Response(JSON.stringify({
            error: "already_registered",
            message: `Adres ${dup.email} ma już rezerwację na to wydarzenie.`,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    const { data: order, error: oErr } = await supabase.from("paid_event_orders").insert({
      event_id: eventId,
      ticket_id: ticketId,
      user_id: currentUserId,
      email: buyerEmailLc,
      first_name: buyer.firstName,

      last_name: buyer.lastName,
      phone: buyer.phone || null,
      quantity: qty,
      total_amount: totalAmount,
      status: "pending",
      payment_provider: "pending",
      ticket_code: code,
    }).select().single();
    if (oErr || !order) {
      return new Response(JSON.stringify({ error: "Nie udało się utworzyć zamówienia", detail: oErr?.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows: any[] = [];
    for (let i = 0; i < totalSeats; i++) {
      const a = attendees[i];
      const isBuyerSeat = i === 0 && buyerIsAttendee;
      rows.push({
        order_id: order.id,
        event_id: eventId,
        seat_index: i + 1,
        first_name: (a?.firstName || "").trim() || (isBuyerSeat ? buyer.firstName : "Gość"),
        last_name: (a?.lastName || "").trim() || (isBuyerSeat ? buyer.lastName : `#${i + 1}`),
        email: (a?.email || "").trim() || (isBuyerSeat ? buyer.email : null),
        ticket_code: ticketCode(),
      });
    }
    const { error: attErr } = await supabase.from("paid_event_order_attendees").insert(rows);
    if (attErr) console.error("[create-event-order] attendees insert:", attErr);

    return new Response(JSON.stringify({ success: true, orderId: order.id, ticketCode: code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-event-order]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
