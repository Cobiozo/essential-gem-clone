import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
 * Aktualizuje CRM po anulowaniu rejestracji.
 * NIGDY nie tworzy duplikatu kontaktu — jeżeli kontakt istnieje (po (partner_user_id, lower(email))),
 * dopisuje notatkę „❌ Anulował(a) rejestrację na: …".
 * Wstawia nowy rekord WYŁĄCZNIE wtedy, gdy żadnego kontaktu z tym e-mailem nie było wcześniej.
 */
async function notifyAndUpdateCRM(
  supabase: any,
  token: string,
): Promise<{ event_id: string | null; banner_url: string | null; event_title: string | null }> {
  const { data: sub } = await supabase
    .from("event_form_submissions")
    .select("id, event_id, partner_user_id, email, first_name, last_name, phone")
    .eq("cancellation_token", token)
    .maybeSingle();
  if (!sub) return { event_id: null, banner_url: null, event_title: null };

  let eventTitle = "wydarzenie";
  let bannerUrl: string | null = null;
  if (sub.event_id) {
    const { data: ev } = await supabase
      .from("paid_events")
      .select("title, banner_url")
      .eq("id", sub.event_id)
      .maybeSingle();
    if (ev?.title) eventTitle = ev.title;
    bannerUrl = ev?.banner_url ?? null;
  }

  const fullName = `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || sub.email;
  const message = `${fullName} (${sub.email}) anulował(a) rejestrację na: ${eventTitle}`;

  // 1) Adminowie
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (admins && admins.length) {
    const adminNotifs = admins.map((a: any) => ({
      user_id: a.user_id,
      notification_type: "event_form_cancelled",
      source_module: "paid_events",
      title: "Gość anulował rejestrację",
      message,
      link: `/admin?tab=paid-events`,
      metadata: { submission_id: sub.id, event_id: sub.event_id, email: sub.email },
    }));
    await supabase.from("user_notifications").insert(adminNotifs);
  }

  // 2) Partner + CRM (bez duplikatów)
  if (sub.partner_user_id) {
    await supabase.from("user_notifications").insert({
      user_id: sub.partner_user_id,
      notification_type: "event_form_cancelled",
      source_module: "paid_events",
      title: "Twój gość anulował rejestrację",
      message,
      link: `/dashboard?tab=contacts`,
      metadata: { submission_id: sub.id, event_id: sub.event_id, email: sub.email },
    });

    const emailLower = (sub.email || "").toLowerCase();

    // Szukamy istniejącego kontaktu — case-insensitive po e-mailu, w obrębie tego partnera.
    // Bierzemy wszystkie pasujące rekordy (na wypadek wcześniejszej duplikacji) i aktualizujemy najnowszy.
    const { data: contacts } = await supabase
      .from("team_contacts")
      .select("id, notes, created_at")
      .eq("user_id", sub.partner_user_id)
      .ilike("email", emailLower)
      .order("created_at", { ascending: false });

    const noteLine = `[${nowStamp()}] ❌ Anulował(a) rejestrację na: ${eventTitle}`;

    if (contacts && contacts.length > 0) {
      // Aktualizuj NAJNOWSZY rekord — nigdy nie wstawiaj nowego.
      const target = contacts[0];
      const newNotes = target.notes ? `${target.notes}\n${noteLine}` : noteLine;
      await supabase.from("team_contacts").update({ notes: newNotes }).eq("id", target.id);
    } else {
      // Brak jakiegokolwiek wpisu — utwórz nowy.
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

  return { event_id: sub.event_id ?? null, banner_url: bannerUrl, event_title: eventTitle };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ success: false, error: "missing_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.rpc("cancel_event_form_submission", { _token: token });
    if (error) throw error;

    let event_id: string | null = null;
    let banner_url: string | null = null;
    let event_title: string | null = null;

    // Powiadomienia + CRM tylko przy pierwszej (skutecznej) anulacji
    if (data?.success && !data?.already_cancelled) {
      try {
        const meta = await notifyAndUpdateCRM(supabase, token);
        event_id = meta.event_id;
        banner_url = meta.banner_url;
        event_title = meta.event_title;
      } catch (notifyErr) {
        console.error("[cancel-event-form-submission] notify error:", notifyErr);
      }
    } else if (data?.success && data?.already_cancelled) {
      // Druga próba — odśwież dane wydarzenia bez aktualizacji CRM
      const { data: sub } = await supabase
        .from("event_form_submissions")
        .select("event_id")
        .eq("cancellation_token", token)
        .maybeSingle();
      if (sub?.event_id) {
        event_id = sub.event_id;
        const { data: ev } = await supabase
          .from("paid_events")
          .select("banner_url, title")
          .eq("id", sub.event_id)
          .maybeSingle();
        banner_url = ev?.banner_url ?? null;
        event_title = ev?.title ?? null;
      }
    }

    return new Response(
      JSON.stringify({ ...data, event_id, banner_url, event_title }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[cancel-event-form-submission]", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
