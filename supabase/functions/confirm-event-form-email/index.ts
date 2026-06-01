import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { issueFreeTicketForOrder, generateTicketCode } from "../_shared/free-event-ticket.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nowStamp() {
  return new Date().toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw",
  });
}

/**
 * Ensures a paid_event_orders row exists for a confirmed free-event form submission,
 * then issues the ticket email (PDF + QR). Idempotent.
 */
async function ensureFreeOrderAndSendTicket(supabase: any, submissionId: string): Promise<void> {
  const { data: sub } = await supabase
    .from("event_form_submissions")
    .select("id, event_id, email, first_name, last_name, phone, submitted_data, partner_user_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub?.event_id || !sub.email) return;

  const { data: ev } = await supabase
    .from("paid_events")
    .select("id, is_free, title")
    .eq("id", sub.event_id)
    .maybeSingle();
  if (!ev?.is_free) return;

  const submitted = (sub.submitted_data || {}) as any;
  let orderId: string | null = submitted.order_id || null;

  if (orderId) {
    const { data: existing } = await supabase
      .from("paid_event_orders")
      .select("id, ticket_sent_at")
      .eq("id", orderId)
      .maybeSingle();
    if (!existing) orderId = null;
    else if (existing.ticket_sent_at) return;
  }

  if (!orderId) {
    const { data: byEmail } = await supabase
      .from("paid_event_orders")
      .select("id, ticket_sent_at")
      .eq("event_id", sub.event_id)
      .eq("email", sub.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail?.id) {
      if (byEmail.ticket_sent_at) return;
      orderId = byEmail.id;
    }
  }

  if (!orderId) {
    const { data: tickets } = await supabase
      .from("paid_event_tickets")
      .select("id, price_pln, is_active, deleted_at, position")
      .eq("event_id", sub.event_id)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    const freeTicket = (tickets || []).find((t: any) => t.is_active && Number(t.price_pln) === 0)
      || (tickets || []).find((t: any) => t.is_active)
      || (tickets || [])[0];
    if (!freeTicket) {
      console.warn("[confirm-event-form-email] no ticket type found for event", sub.event_id);
      return;
    }

    const ticketCode = generateTicketCode();
    const nowIso = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("paid_event_orders")
      .insert({
        event_id: sub.event_id,
        ticket_id: freeTicket.id,
        email: sub.email,
        first_name: sub.first_name || "",
        last_name: sub.last_name || "",
        phone: sub.phone || null,
        quantity: 1,
        total_amount: 0,
        status: "paid",
        email_confirmed_at: nowIso,
        ticket_code: ticketCode,
        ticket_generated_at: nowIso,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      console.error("[confirm-event-form-email] failed creating free order", insErr);
      return;
    }
    orderId = inserted.id;

    await supabase.from("paid_event_order_attendees").insert({
      order_id: orderId,
      event_id: sub.event_id,
      seat_index: 1,
      first_name: sub.first_name || "",
      last_name: sub.last_name || "",
      email: sub.email,
      ticket_code: ticketCode,
    });

    await supabase
      .from("event_form_submissions")
      .update({ submitted_data: { ...submitted, order_id: orderId } })
      .eq("id", sub.id);
  }

  try {
    const res = await issueFreeTicketForOrder(supabase, orderId!);
    console.log("[confirm-event-form-email] issueFreeTicketForOrder", orderId, res);
  } catch (e) {
    console.error("[confirm-event-form-email] issueFreeTicketForOrder failed", e);
  }
}

async function notifyAndUpdateCRM(supabase: any, submissionId: string) {
  // Pobierz pełne dane zgłoszenia
  const { data: sub } = await supabase
    .from("event_form_submissions")
    .select("id, event_id, partner_user_id, email, first_name, last_name, phone")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return;

  // Tytuł wydarzenia
  let eventTitle = "wydarzenie";
  if (sub.event_id) {
    const { data: ev } = await supabase
      .from("paid_events")
      .select("title")
      .eq("id", sub.event_id)
      .maybeSingle();
    if (ev?.title) eventTitle = ev.title;
  }

  const fullName = `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || sub.email;
  const message = `${fullName} (${sub.email}) potwierdził(a) rejestrację na: ${eventTitle}`;

  // 1) Powiadom adminów
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (admins && admins.length) {
    const adminNotifs = admins.map((a: any) => ({
      user_id: a.user_id,
      notification_type: "event_form_confirmed",
      source_module: "paid_events",
      title: "Gość potwierdził e-mail rejestracji",
      message,
      link: `/admin?tab=paid-events`,
      metadata: { submission_id: sub.id, event_id: sub.event_id, email: sub.email },
    }));
    await supabase.from("user_notifications").insert(adminNotifs);
  }

  // 2) Powiadom partnera zapraszającego + aktualizacja CRM
  if (sub.partner_user_id) {
    await supabase.from("user_notifications").insert({
      user_id: sub.partner_user_id,
      notification_type: "event_form_confirmed",
      source_module: "paid_events",
      title: "Twój gość potwierdził rejestrację",
      message,
      link: `/dashboard?tab=contacts`,
      metadata: { submission_id: sub.id, event_id: sub.event_id, email: sub.email },
    });

    // Znajdź lub utwórz wpis CRM (bez duplikatów — bierzemy ostatni pasujący)
    const emailLower = (sub.email || "").toLowerCase();
    const { data: contacts } = await supabase
      .from("team_contacts")
      .select("id, notes, created_at")
      .eq("user_id", sub.partner_user_id)
      .ilike("email", emailLower)
      .order("created_at", { ascending: false });

    const noteLine = `[${nowStamp()}] ✅ Potwierdził rejestrację na: ${eventTitle}`;

    if (contacts && contacts.length > 0) {
      const target = contacts[0];
      const newNotes = target.notes ? `${target.notes}\n${noteLine}` : noteLine;
      await supabase.from("team_contacts").update({ notes: newNotes }).eq("id", target.id);
    } else {
      await supabase.from("team_contacts").insert({
        user_id: sub.partner_user_id,
        first_name: sub.first_name || "",
        last_name: sub.last_name || "",
        email: emailLower,
        phone_number: sub.phone,
        role: "client",
        contact_type: "private",
        contact_source: "event_invite",
        contact_reason: `Rejestracja na: ${eventTitle}`,
        notes: noteLine,
        is_active: true,
      });
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ success: false, error: "missing_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.rpc("confirm_event_form_email", { _token: token });
    if (error) throw error;

    // Wzbogacamy odpowiedź o dane wydarzenia (banner) potrzebne stronie potwierdzającej
    let event_id: string | null = null;
    let banner_url: string | null = null;
    let event_title: string | null = null;
    let is_free: boolean | null = null;
    if (data?.success && data?.submission_id) {
      const { data: sub } = await supabase
        .from("event_form_submissions")
        .select("event_id")
        .eq("id", data.submission_id)
        .maybeSingle();
      if (sub?.event_id) {
        event_id = sub.event_id;
        const { data: ev } = await supabase
          .from("paid_events")
          .select("banner_url, title, is_free")
          .eq("id", sub.event_id)
          .maybeSingle();
        banner_url = ev?.banner_url ?? null;
        event_title = ev?.title ?? null;
        is_free = ev?.is_free ?? null;

        // Fallback: jeśli flaga is_free nie jest ustawiona na true,
        // sprawdź ceny aktywnych biletów. Brak biletów płatnych = wydarzenie bezpłatne.
        if (is_free !== true) {
          const { data: tks } = await supabase
            .from("paid_event_tickets")
            .select("price_pln, is_active, deleted_at")
            .eq("event_id", sub.event_id)
            .is("deleted_at", null);
          const activeTickets = (tks || []).filter((t: any) => t.is_active);
          const pool = activeTickets.length > 0 ? activeTickets : (tks || []);
          if (pool.length > 0 && pool.every((t: any) => Number(t.price_pln) === 0)) {
            is_free = true;
          }
        }
      }
    }

    // Wyślij powiadomienia tylko przy pierwszym potwierdzeniu (nie przy "already_confirmed")
    if (data?.success && !data?.already_confirmed && data?.submission_id) {
      try {
        await notifyAndUpdateCRM(supabase, data.submission_id);
      } catch (notifyErr) {
        console.error("[confirm-event-form-email] notify error:", notifyErr);
      }
    }

    // Dla wydarzeń bezpłatnych: utwórz zamówienie + wyślij maila z biletem (PDF + QR) w tle
    if (data?.success && data?.submission_id && is_free) {
      const ticketTask = ensureFreeOrderAndSendTicket(supabase, data.submission_id)
        .then(() => console.log("[confirm-event-form-email] free-ticket flow finished", data.submission_id))
        .catch((e) => console.error("[confirm-event-form-email] ticket flow failed", e));
      try {
        // @ts-ignore EdgeRuntime is provided by Supabase
        EdgeRuntime.waitUntil(ticketTask);
      } catch {
        void ticketTask;
      }
    }

    return new Response(
      JSON.stringify({ ...data, event_id, banner_url, event_title, is_free }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[confirm-event-form-email]", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
