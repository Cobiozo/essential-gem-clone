import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  submissionId: string;
}

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  encryption_type: string;
  sender_email: string;
  sender_name: string;
}

function base64Encode(str: string): string {
  const data = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...data));
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

async function sendSmtp(s: SmtpSettings, to: string, subject: string, html: string) {
  let conn: Deno.TcpConn | Deno.TlsConn;
  if (s.encryption_type === "ssl") {
    conn = await withTimeout(Deno.connectTls({ hostname: s.smtp_host, port: s.smtp_port }), 15000, "TLS timeout");
  } else {
    conn = await withTimeout(Deno.connect({ hostname: s.smtp_host, port: s.smtp_port }), 15000, "TCP timeout");
  }
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const read = async () => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return n ? dec.decode(buf.subarray(0, n)) : "";
  };
  const send = async (cmd: string) => {
    await conn.write(enc.encode(cmd + "\r\n"));
    return await read();
  };
  try {
    await read();
    const senderDomain = s.sender_email.split("@")[1] || "localhost";
    await send(`EHLO ${senderDomain}`);
    if (s.encryption_type === "starttls") {
      await send("STARTTLS");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: s.smtp_host });
      await send(`EHLO ${senderDomain}`);
    }
    await send("AUTH LOGIN");
    await send(btoa(s.smtp_username));
    const auth = await send(btoa(s.smtp_password));
    if (!auth.includes("235")) throw new Error(`Auth failed: ${auth}`);
    await send(`MAIL FROM:<${s.sender_email}>`);
    await send(`RCPT TO:<${to}>`);
    await send("DATA");
    const boundary = `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${senderDomain}>`;
    const plain = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    const msg = [
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `From: "${s.sender_name}" <${s.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(plain),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(html),
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");
    const r = await send(msg);
    if (!r.includes("250")) throw new Error(`Send failed: ${r}`);
    await send("QUIT");
  } finally {
    try { conn.close(); } catch (_) { /* ignore */ }
  }
}

function buildEmail(opts: {
  firstName: string;
  formTitle: string;
  bannerUrl?: string | null;
  bodyHtml?: string | null;
  eventTitle: string;
  eventDate: string;
  paymentDetails: any;
  submittedFields: Array<{ label: string; value: string }>;
  confirmUrl: string;
  cancelUrl: string;
  publicBaseUrl: string;
}): string {
  const fieldsHtml = opts.submittedFields
    .map(f => `<tr><td style="padding:6px 12px;color:#666;font-size:13px;">${f.label}</td><td style="padding:6px 12px;font-weight:600;">${f.value}</td></tr>`)
    .join("");

  const paymentHtml = opts.paymentDetails && Object.keys(opts.paymentDetails).length
    ? `<div style="background:#fdf8ec;border-left:4px solid #D4AF37;padding:18px 22px;border-radius:8px;margin:20px 0;">
        <h3 style="margin:0 0 10px;color:#D4AF37;font-size:16px;">💳 Dane do płatności</h3>
        ${opts.paymentDetails.amount ? `<p style="margin:4px 0;"><strong>Kwota:</strong> ${opts.paymentDetails.amount}</p>` : ""}
        ${opts.paymentDetails.account_number ? `<p style="margin:4px 0;"><strong>Numer konta:</strong> ${opts.paymentDetails.account_number}</p>` : ""}
        ${opts.paymentDetails.recipient ? `<p style="margin:4px 0;"><strong>Odbiorca:</strong> ${opts.paymentDetails.recipient}</p>` : ""}
        ${opts.paymentDetails.title ? `<p style="margin:4px 0;"><strong>Tytuł przelewu:</strong> ${opts.paymentDetails.title}</p>` : ""}
        ${opts.paymentDetails.deadline ? `<p style="margin:4px 0;"><strong>Termin:</strong> ${opts.paymentDetails.deadline}</p>` : ""}
        ${opts.paymentDetails.notes ? `<p style="margin:10px 0 0;font-size:13px;color:#555;">${opts.paymentDetails.notes}</p>` : ""}
      </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="padding:24px;background:linear-gradient(135deg,#D4AF37,#F5E6A3,#D4AF37);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="middle" style="padding:0 12px;">
            <img src="${logoUrl}" alt="Pure Life" style="max-width:150px;height:auto;display:inline-block;vertical-align:middle;" />
          </td>
          <td align="center" valign="middle" width="1" style="border-left:1px solid rgba(0,0,0,0.18);height:40px;"></td>
          <td align="center" valign="middle" style="padding:0 12px;">
            <img src="${eqologyLogoUrl}" alt="Eqology Independent Business Partner" style="max-width:150px;height:auto;display:inline-block;vertical-align:middle;" />
          </td>
        </tr>
      </table>
    </div>
    ${opts.bannerUrl ? `<img src="${opts.bannerUrl}" alt="${opts.formTitle}" style="display:block;width:100%;height:auto;" />` : ""}
    <div style="padding:30px;">
      <h1 style="margin:0 0 10px;font-size:22px;color:#222;">${opts.formTitle}</h1>
      <p style="font-size:15px;">Cześć <strong>${opts.firstName || ""}</strong>!</p>
      <p style="font-size:15px;line-height:1.6;">Dziękujemy za zgłoszenie na wydarzenie <strong>${opts.eventTitle}</strong>${opts.eventDate ? ` (${opts.eventDate})` : ""}.</p>

      ${opts.bodyHtml ? `<div style="font-size:14px;line-height:1.6;margin:18px 0;">${opts.bodyHtml}</div>` : ""}

      ${paymentHtml}

      ${opts.submittedFields.length ? `<h3 style="font-size:15px;color:#444;margin:24px 0 8px;">Twoje dane zgłoszeniowe:</h3>
        <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:6px;overflow:hidden;">${fieldsHtml}</table>` : ""}

      <div style="margin:30px 0;text-align:center;">
        <a href="${opts.confirmUrl}" style="display:inline-block;background:#D4AF37;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">✅ Potwierdzam otrzymanie wiadomości</a>
      </div>

      <p style="text-align:center;font-size:13px;color:#888;margin:18px 0;">
        Chcesz anulować zgłoszenie? <a href="${opts.cancelUrl}" style="color:#c0392b;">Anuluj rejestrację</a>
      </p>
    </div>
    <div style="text-align:center;padding:18px;background:#fafafa;color:#999;font-size:12px;border-top:1px solid #eee;">
      © ${new Date().getFullYear()} Pure Life Center. Wszelkie prawa zastrzeżone.
    </div>
  </div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submissionId }: ReqBody = await req.json();
    if (!submissionId) throw new Error("submissionId required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // NOTE: event_form_submissions has no FK constraints in the schema, so PostgREST embed
    // (paid_events!fk(...)) fails with "Could not find a relationship". Fetch each table separately.
    const { data: sub, error: subErr } = await supabase
      .from("event_form_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (subErr || !sub) throw new Error(`Submission not found: ${subErr?.message}`);

    const { data: form } = await supabase
      .from("event_registration_forms")
      .select("*")
      .eq("id", sub.form_id)
      .maybeSingle();

    const { data: event } = sub.event_id
      ? await supabase
          .from("paid_events")
          .select("title, event_date, location")
          .eq("id", sub.event_id)
          .maybeSingle()
      : { data: null };

    // CRITICAL: Public email links MUST point to the production domain
    // (purelife.info.pl). The Lovable preview domain (purelife.lovable.app)
    // currently redirects unauthenticated users to /auth, which would break
    // guest confirm/cancel links from emails.
    const publicBaseUrl = Deno.env.get("PUBLIC_EMAIL_LINK_BASE_URL")
      || Deno.env.get("PUBLIC_SITE_URL")
      || "https://purelife.info.pl";
    const confirmUrl = `${publicBaseUrl}/event-form/confirm/${sub.confirmation_token}`;
    const cancelUrl = `${publicBaseUrl}/event-form/cancel/${sub.cancellation_token}`;

    const eventDateFmt = event?.event_date
      ? new Date(event.event_date).toLocaleString("pl-PL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }) +
        (event.location ? ` · ${event.location}` : "")
      : "";

    // Build dynamic submitted fields list from fields_config
    const fieldsConfig = (form?.fields_config || []) as Array<{ key: string; label: string }>;
    const submittedFields = fieldsConfig
      .filter(f => sub.submitted_data?.[f.key])
      .map(f => ({ label: f.label, value: String(sub.submitted_data[f.key]) }));

    const html = buildEmail({
      firstName: sub.first_name || "",
      formTitle: form?.title || "Rejestracja na wydarzenie",
      bannerUrl: form?.banner_url,
      bodyHtml: form?.email_body,
      eventTitle: event?.title || "",
      eventDate: eventDateFmt,
      paymentDetails: form?.payment_details || {},
      submittedFields,
      confirmUrl,
      cancelUrl,
      publicBaseUrl,
    });

    const subject = form?.email_subject || "Potwierdzenie rejestracji";

    // SMTP
    const { data: smtp } = await supabase.from("smtp_settings").select("*").eq("is_active", true).single();
    if (!smtp) {
      console.warn("[send-event-form-confirmation] No SMTP configured");
      await supabase.from("event_form_submissions").update({ email_status: "failed" }).eq("id", submissionId);
      return new Response(JSON.stringify({ success: false, error: "no_smtp" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
      // DB column is `smtp_encryption`; sendSmtp expects `encryption_type`. Normalize here.
      const smtpNormalized: SmtpSettings = {
        ...(smtp as any),
        encryption_type: ((smtp as any).encryption_type ?? (smtp as any).smtp_encryption ?? "ssl").toString().toLowerCase(),
      };
      await sendSmtp(smtpNormalized, sub.email, subject, html);
      await supabase.from("event_form_submissions")
        .update({ email_status: "sent", email_sent_at: new Date().toISOString() })
        .eq("id", submissionId);
      await supabase.from("email_logs").insert({
        recipient_email: sub.email,
        subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { type: "event_form_confirmation", submission_id: submissionId, form_id: form?.id, event_id: sub.event_id },
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e: any) {
      console.error("[send-event-form-confirmation] SMTP error:", e);
      await supabase.from("event_form_submissions").update({ email_status: "failed" }).eq("id", submissionId);
      await supabase.from("email_logs").insert({
        recipient_email: sub.email,
        subject,
        status: "failed",
        error_message: e.message,
        metadata: { type: "event_form_confirmation", submission_id: submissionId },
      });
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e: any) {
    console.error("[send-event-form-confirmation] Error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
