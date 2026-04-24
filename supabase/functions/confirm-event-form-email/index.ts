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

    // Znajdź lub utwórz wpis CRM
    const emailLower = (sub.email || "").toLowerCase();
    const { data: contact } = await supabase
      .from("team_contacts")
      .select("id, notes")
      .eq("user_id", sub.partner_user_id)
      .eq("email", emailLower)
      .maybeSingle();

    const noteLine = `[${nowStamp()}] ✅ Potwierdził rejestrację na: ${eventTitle}`;

    if (contact) {
      const newNotes = contact.notes ? `${contact.notes}\n${noteLine}` : noteLine;
      await supabase.from("team_contacts").update({ notes: newNotes }).eq("id", contact.id);
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

    // Wyślij powiadomienia tylko przy pierwszym potwierdzeniu (nie przy "already_confirmed")
    if (data?.success && !data?.already_confirmed && data?.submission_id) {
      try {
        await notifyAndUpdateCRM(supabase, data.submission_id);
      } catch (notifyErr) {
        console.error("[confirm-event-form-email] notify error:", notifyErr);
        // nie failujemy całego requestu — gość ma zobaczyć potwierdzenie
      }
    }

    return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[confirm-event-form-email]", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
