import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  email: string;
  firstName?: string;
  lastName?: string;
  eventId: string;
  eventTitle: string;
  occurrenceDatetime?: string | null;
  reason: 'no_link' | 'send_failed';
  errorMessage?: string;
}

function b64(str: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}
function b64a(str: string): string { return btoa(str); }
function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error(msg)), ms))]);
}

interface SmtpSettings {
  host: string; port: number; username: string; password: string;
  encryption_type: string; sender_email: string; sender_name: string;
}

async function sendSmtpEmail(s: SmtpSettings, to: string, subject: string, html: string) {
  let conn: Deno.TcpConn | Deno.TlsConn;
  if (s.encryption_type === "ssl") {
    conn = await withTimeout(Deno.connectTls({ hostname: s.host, port: s.port }), 15000, "SSL timeout");
  } else {
    conn = await withTimeout(Deno.connect({ hostname: s.host, port: s.port }), 15000, "TCP timeout");
  }
  const enc = new TextEncoder(); const dec = new TextDecoder();
  const read = async () => { const buf = new Uint8Array(4096); const n = await conn.read(buf); return n ? dec.decode(buf.subarray(0, n)) : ""; };
  const cmd = async (c: string) => { await conn.write(enc.encode(c + "\r\n")); return await read(); };
  try {
    await read();
    const domain = s.sender_email.split('@')[1] || 'localhost';
    await cmd(`EHLO ${domain}`);
    if (s.encryption_type === "starttls") {
      const r = await cmd("STARTTLS"); if (!r.startsWith("220")) throw new Error("STARTTLS failed");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: s.host });
      await cmd(`EHLO ${domain}`);
    }
    await cmd("AUTH LOGIN"); await cmd(b64a(s.username));
    const auth = await cmd(b64a(s.password));
    if (!auth.includes("235")) throw new Error(`Auth failed: ${auth}`);
    const mf = await cmd(`MAIL FROM:<${s.sender_email}>`); if (!mf.startsWith("250")) throw new Error(mf);
    const rc = await cmd(`RCPT TO:<${to}>`); if (!rc.startsWith("250")) throw new Error(rc);
    const dr = await cmd("DATA"); if (!dr.startsWith("354")) throw new Error(dr);
    const boundary = `----=_${Date.now()}`;
    const plain = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const msg = [
      `From: "${s.sender_name}" <${s.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``, `--${boundary}`, `Content-Type: text/plain; charset=UTF-8`, `Content-Transfer-Encoding: base64`, ``,
      b64(plain), ``, `--${boundary}`, `Content-Type: text/html; charset=UTF-8`, `Content-Transfer-Encoding: base64`, ``,
      b64(html), ``, `--${boundary}--`, `.`,
    ].join("\r\n");
    const resp = await cmd(msg);
    if (!resp.includes("250")) throw new Error(`Send failed: ${resp}`);
    await cmd("QUIT");
  } finally {
    try { conn.close(); } catch { /* noop */ }
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const p: Payload = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Persist alert (dedupe on unique index)
    const { data: alert, error: alertErr } = await supabase
      .from('missing_join_link_alerts')
      .insert({
        event_id: p.eventId,
        occurrence_datetime: p.occurrenceDatetime || null,
        recipient_email: p.email,
        recipient_name: [p.firstName, p.lastName].filter(Boolean).join(' ') || null,
        event_title: p.eventTitle,
        reason: p.reason,
      })
      .select('id')
      .maybeSingle();

    if (alertErr && !alertErr.message?.includes('duplicate')) {
      console.warn('[notify-admins-missing-join-link] insert alert failed:', alertErr.message);
    }

    // 2. Fetch admins
    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const adminIds = (adminRoles || []).map((r: any) => r.user_id);
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'no admins' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. In-app notification for each admin
    await supabase.from('user_notifications').insert(
      adminIds.map((uid) => ({
        user_id: uid,
        notification_type: 'system',
        source_module: 'events',
        title: '⚠️ Gość nie dostał linku do webinaru',
        message: `${p.firstName || 'Gość'} (${p.email}) zarejestrował się tuż przed startem webinaru "${p.eventTitle}", ale nie otrzymał emaila z linkiem (${p.reason === 'no_link' ? 'brak linku Zoom' : 'błąd wysyłki SMTP'}). Wejdź do panelu i wyślij link ręcznie.`,
        link: '/admin/events',
        metadata: { event_id: p.eventId, registered_email: p.email, reason: p.reason, alert_id: alert?.id, severity: 'critical' },
      }))
    );

    // 4. Email to each admin
    const { data: profiles } = await supabase.from('profiles').select('user_id, email, first_name').in('user_id', adminIds);
    const { data: smtp } = await supabase.from('smtp_settings').select('*').eq('is_active', true).single();
    if (!smtp) {
      console.warn('[notify-admins-missing-join-link] no smtp settings, skipping email');
      return new Response(JSON.stringify({ success: true, message: 'in-app only' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const smtpSettings: SmtpSettings = {
      host: smtp.smtp_host, port: smtp.smtp_port, username: smtp.smtp_username,
      password: smtp.smtp_password, encryption_type: smtp.smtp_encryption,
      sender_email: smtp.sender_email, sender_name: smtp.sender_name,
    };

    const occStr = p.occurrenceDatetime ? new Date(p.occurrenceDatetime).toLocaleString('pl-PL') : '—';
    const reasonPl = p.reason === 'no_link'
      ? 'wydarzenie nie ma skonfigurowanego linku Zoom ani lokalizacji'
      : `nie udało się wysłać emaila (${p.errorMessage || 'błąd SMTP'})`;
    const panelUrl = 'https://purelife.lovable.app/admin/events';
    const subject = `⚠️ Gość nie dostał linku do webinaru "${p.eventTitle}" — akcja wymagana`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#dc2626;">⚠️ Uwaga — gość bez linku do webinaru</h2>
        <p>Gość zarejestrował się <strong>tuż przed startem</strong> webinaru i <strong>nie otrzymał</strong> emaila z linkiem do dołączenia. Wejdź do panelu i wyślij link ręcznie <strong>natychmiast</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fef2f2;border-left:4px solid #dc2626;">
          <tr><td style="padding:8px 12px;color:#666;">Webinar:</td><td style="padding:8px 12px;font-weight:bold;">${p.eventTitle}</td></tr>
          <tr><td style="padding:8px 12px;color:#666;">Termin:</td><td style="padding:8px 12px;">${occStr}</td></tr>
          <tr><td style="padding:8px 12px;color:#666;">Gość:</td><td style="padding:8px 12px;">${p.firstName || ''} ${p.lastName || ''} — <a href="mailto:${p.email}">${p.email}</a></td></tr>
          <tr><td style="padding:8px 12px;color:#666;">Powód:</td><td style="padding:8px 12px;color:#dc2626;">${reasonPl}</td></tr>
        </table>
        <div style="text-align:center;margin:28px 0;">
          <a href="${panelUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">Otwórz panel Eventy → Rejestracje</a>
        </div>
        <p style="color:#666;font-size:13px;">Znajdź gościa na liście rejestracji i kliknij „Ponów przypomnienie → 15 min" żeby wysłać link ręcznie.</p>
      </div>`;

    const results = await Promise.allSettled(
      (profiles || []).filter((pr: any) => pr.email).map((pr: any) =>
        sendSmtpEmail(smtpSettings, pr.email, subject, html).then(() =>
          supabase.from('email_logs').insert({
            recipient_email: pr.email, subject, status: 'sent', sent_at: new Date().toISOString(),
            metadata: { type: 'admin_missing_join_link_alert', event_id: p.eventId, guest_email: p.email, reason: p.reason },
          })
        ).catch((e) =>
          supabase.from('email_logs').insert({
            recipient_email: pr.email, subject, status: 'failed', error_message: String(e?.message || e),
            metadata: { type: 'admin_missing_join_link_alert', event_id: p.eventId, guest_email: p.email, reason: p.reason },
          })
        )
      )
    );
    const okCount = results.filter((r) => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ success: true, emailed: okCount, admins: profiles?.length || 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error('[notify-admins-missing-join-link] Error:', err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
