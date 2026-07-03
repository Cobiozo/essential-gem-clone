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

// Strip HTML tags and inline styles from event description; keep paragraph breaks.
function sanitizeDescription(raw: string): string {
  if (!raw) return "";
  let s = String(raw);
  // Remove style/script blocks entirely
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  // Block-level -> newlines
  s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n\n");
  s = s.replace(/<\s*li[^>]*>/gi, "• ");
  // Drop all remaining tags
  s = s.replace(/<[^>]+>/g, "");
  // Decode common entities
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&hellip;/gi, "…");
  // Collapse whitespace, keep double newlines as paragraph markers
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.split("\n").map((l) => l.trim()).join("\n").trim();
  if (s.length > 600) s = s.slice(0, 600).replace(/\s+\S*$/, "") + "…";
  return s;
}

function renderDescriptionHtml(text: string): string {
  if (!text) return "";
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 12px 0;color:#4b5563;line-height:1.6;font-size:15px;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
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
  // Pages redirect unauthenticated users to /auth?n=<targetPath> and Auth.tsx returns them here after login.
  const cta = target;
  const when = formatWarsawDateTime(event.start_time);
  const desc = sanitizeDescription(event.description ?? "");
  const descHtml = renderDescriptionHtml(desc);
  const preheader = `${event.title} — ${when}`;

  const image = event.image_url
    ? `<img src="${escapeHtml(event.image_url)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:12px;margin:0 0 20px 0;" />`
    : "";

  const infoRow = (emoji: string, label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;font-size:15px;color:#374151;">
        <span style="display:inline-block;width:22px;">${emoji}</span>
        <strong style="color:#111827;">${label}:</strong> ${escapeHtml(value)}
      </td>
    </tr>`;

  const infoRows = [
    infoRow("📅", "Termin", when),
    event.host_name ? infoRow("👤", "Prowadzący", event.host_name) : "",
    event.location ? infoRow("📍", "Miejsce", event.location) : "",
  ].join("");

  const subject = `Zaproszenie: ${event.title}`;
  const html = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;max-width:560px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <tr><td style="background:#eab308;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 28px 32px;">
          ${image}
          <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#111827;font-weight:700;">${escapeHtml(event.title)}</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
            ${infoRows}
          </table>
          ${descHtml ? `<div style="margin:0 0 28px 0;">${descHtml}</div>` : ""}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 4px 0;">
              <a href="${cta}" style="display:inline-block;background:#eab308;color:#111827;text-decoration:none;font-weight:700;font-size:17px;padding:16px 44px;border-radius:10px;letter-spacing:0.2px;">
                Zapisz się
              </a>
            </td></tr>
            <tr><td align="center" style="padding:14px 0 0 0;">
              <a href="${cta}" style="color:#6b7280;font-size:13px;text-decoration:underline;">Zobacz szczegóły wydarzenia</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">
            Otrzymujesz tę wiadomość, ponieważ jesteś członkiem Pure Life Center.<br/>
            Jeśli przycisk nie działa, wklej ten adres w przeglądarce:<br/>
            <a href="${cta}" style="color:#9ca3af;word-break:break-all;">${cta}</a>
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

    // Candidates
    let eligible: Array<{ user_id: string; email: string }> = [];

    if (camp.test_mode) {
      if (!camp.test_recipient_user_id) {
        await supabase.from("event_email_campaigns").update({ status: "failed", error: "test_mode without test_recipient_user_id" }).eq("id", camp.id);
        continue;
      }
      const { data: testProfile, error: tpErr } = await supabase
        .from("profiles")
        .select("user_id,email")
        .eq("user_id", camp.test_recipient_user_id)
        .eq("is_active", true)
        .is("blocked_at", null)
        .not("email", "is", null)
        .maybeSingle();
      if (tpErr || !testProfile) {
        await supabase.from("event_email_campaigns").update({ status: "failed", error: `test recipient not found/inactive: ${tpErr?.message ?? "n/a"}` }).eq("id", camp.id);
        continue;
      }
      // Skip already-sent in THIS campaign (idempotency on retry)
      const { data: alreadyInCamp } = await supabase
        .from("event_email_recipients")
        .select("user_id")
        .eq("campaign_id", camp.id)
        .eq("user_id", testProfile.user_id);
      if ((alreadyInCamp ?? []).length === 0) {
        eligible = [{ user_id: testProfile.user_id, email: testProfile.email as string }];
      }
    } else {
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
      // Exclude: registered for event OR already sent within THIS campaign (not the whole event)
      const [{ data: sentInCamp }, { data: alreadyReg }] = await Promise.all([
        supabase.from("event_email_recipients").select("user_id").eq("campaign_id", camp.id),
        supabase.from("event_registrations").select("user_id").eq("event_id", camp.event_id).in("user_id", userIds),
      ]);
      const excluded = new Set<string>([
        ...(sentInCamp ?? []).map((r: any) => r.user_id),
        ...(alreadyReg ?? []).map((r: any) => r.user_id),
      ]);
      eligible = (profiles ?? []).filter((p: any) => !excluded.has(p.user_id) && !!p.email) as any;
    }

    const batch = eligible.slice(0, BATCH_LIMIT);
    console.log(`[campaigns] ${camp.id} test=${!!camp.test_mode} eligible=${eligible.length} batch=${batch.length}`);

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
