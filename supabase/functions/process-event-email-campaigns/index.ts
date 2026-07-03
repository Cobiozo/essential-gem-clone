import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://purelife.lovable.app";
const BATCH_LIMIT = 200;

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatWarsawDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      dateStyle: "full",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function routeForEventType(eventType: string): string {
  switch (eventType) {
    case "team_training":
      return "/events/team-meetings";
    case "webinar":
      return "/events/webinars";
    default:
      return "/dashboard";
  }
}

function buildEmailHtml(event: any): { subject: string; html: string } {
  const targetPath = `${routeForEventType(event.event_type)}?event=${event.id}&utm=email_invite`;
  const target = `${APP_ORIGIN}${targetPath}`;
  const loginRedirect = `${APP_ORIGIN}/auth?returnTo=${encodeURIComponent(targetPath)}`;
  const cta = target; // /auth already redirects to target if not logged in via ProtectedRoute
  const when = formatWarsawDateTime(event.start_time);
  const desc = (event.description ?? "").slice(0, 500);
  const image = event.image_url ? `<img src="${escapeHtml(event.image_url)}" alt="" style="max-width:100%;border-radius:8px;margin-bottom:16px;" />` : "";
  const host = event.host_name ? `<p style="margin:4px 0;color:#4b5563;"><strong>Prowadzący:</strong> ${escapeHtml(event.host_name)}</p>` : "";
  const location = event.location ? `<p style="margin:4px 0;color:#4b5563;"><strong>Miejsce:</strong> ${escapeHtml(event.location)}</p>` : "";

  const subject = `Zaproszenie: ${event.title}`;
  const html = `<!doctype html>
<html lang="pl">
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;max-width:600px;">
        <tr><td>
          ${image}
          <h1 style="margin:0 0 12px 0;font-size:22px;color:#111827;">${escapeHtml(event.title)}</h1>
          <p style="margin:4px 0;color:#4b5563;"><strong>Termin:</strong> ${escapeHtml(when)}</p>
          ${host}
          ${location}
          ${desc ? `<p style="margin:16px 0;color:#374151;line-height:1.5;white-space:pre-wrap;">${escapeHtml(desc)}</p>` : ""}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td align="center" style="background:#eab308;border-radius:8px;">
              <a href="${cta}" style="display:inline-block;padding:14px 28px;color:#111827;text-decoration:none;font-weight:700;font-size:16px;">
                Zapisz się
              </a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0 0;color:#6b7280;font-size:13px;">
            Jeżeli przycisk nie działa, skopiuj link: <br/>
            <a href="${cta}" style="color:#2563eb;word-break:break-all;">${cta}</a>
          </p>
          <p style="margin:8px 0 0 0;color:#9ca3af;font-size:12px;">
            Nie jesteś zalogowany? <a href="${loginRedirect}" style="color:#2563eb;">Zaloguj się i przejdź do wydarzenia</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nowIso = new Date().toISOString();
  console.log(`[campaigns] tick @ ${nowIso}`);

  // Fetch due campaigns
  const { data: campaigns, error: cErr } = await supabase
    .from("event_email_campaigns")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(5);

  if (cErr) {
    console.error("[campaigns] load error", cErr);
    return new Response(JSON.stringify({ error: cErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const results: any[] = [];

  for (const camp of campaigns ?? []) {
    // Lock: set processing
    const { error: lockErr } = await supabase
      .from("event_email_campaigns")
      .update({ status: "processing" })
      .eq("id", camp.id)
      .eq("status", "pending");
    if (lockErr) {
      console.error("[campaigns] lock error", camp.id, lockErr);
      continue;
    }

    // Load event
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("id,title,description,start_time,end_time,event_type,image_url,host_name,location")
      .eq("id", camp.event_id)
      .maybeSingle();

    if (evErr || !ev) {
      await supabase.from("event_email_campaigns").update({ status: "failed", error: `event missing: ${evErr?.message ?? "not found"}` }).eq("id", camp.id);
      continue;
    }

    // Candidates: active profiles, not blocked, with email, not already sent for this event, not registered yet
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id,email")
      .eq("is_active", true)
      .is("blocked_at", null)
      .not("email", "is", null)
      .limit(5000);

    if (pErr) {
      await supabase.from("event_email_campaigns").update({ status: "failed", error: pErr.message }).eq("id", camp.id);
      continue;
    }

    const userIds = (profiles ?? []).map((p: any) => p.user_id);
    const [{ data: alreadySent }, { data: alreadyReg }] = await Promise.all([
      supabase.from("event_email_recipients").select("user_id").eq("event_id", camp.event_id),
      supabase.from("event_registrations").select("user_id").eq("event_id", camp.event_id).in("user_id", userIds),
    ]);
    const excluded = new Set<string>([
      ...(alreadySent ?? []).map((r: any) => r.user_id),
      ...(alreadyReg ?? []).map((r: any) => r.user_id),
    ]);

    const eligible = (profiles ?? []).filter((p: any) => !excluded.has(p.user_id) && !!p.email);
    const batch = eligible.slice(0, BATCH_LIMIT);
    console.log(`[campaigns] ${camp.id} eligible=${eligible.length} batch=${batch.length}`);

    const { subject, html } = buildEmailHtml(ev);

    let sentCount = 0;
    for (const rcpt of batch) {
      try {
        const { error: sErr } = await supabase.functions.invoke("send-single-email", {
          body: {
            recipient_email: rcpt.email,
            subject,
            html_body: html,
            skip_template: true,
          },
        });
        if (sErr) {
          console.error("[campaigns] send error", rcpt.email, sErr);
          continue;
        }
        const { error: rErr } = await supabase.from("event_email_recipients").insert({
          event_id: camp.event_id,
          user_id: rcpt.user_id,
          email: rcpt.email,
          campaign_id: camp.id,
        });
        if (!rErr) sentCount++;
      } catch (e) {
        console.error("[campaigns] send exception", rcpt.email, e);
      }
    }

    // If there are still eligible left, remain pending for next tick; else finalize
    const hasMore = eligible.length > batch.length;
    const { data: updated } = await supabase
      .from("event_email_campaigns")
      .update({
        status: hasMore ? "pending" : "sent",
        sent_at: hasMore ? null : new Date().toISOString(),
        recipients_count: (camp.recipients_count ?? 0) + sentCount,
      })
      .eq("id", camp.id)
      .select()
      .maybeSingle();

    results.push({ campaign_id: camp.id, sent: sentCount, has_more: hasMore, updated: !!updated });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
