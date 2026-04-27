import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpSettings {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

function base64Ascii(s: string) { return btoa(s); }
function base64Utf8(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

async function sendSmtp(settings: SmtpSettings, to: string, subject: string, html: string): Promise<boolean> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let conn: Deno.Conn | null = null;
  try {
    conn = settings.encryption === 'ssl'
      ? await withTimeout(Deno.connectTls({ hostname: settings.host, port: settings.port }), 30000)
      : await withTimeout(Deno.connect({ hostname: settings.host, port: settings.port }), 30000);

    const read = async (): Promise<string> => {
      const buf = new Uint8Array(4096);
      const n = await conn!.read(buf);
      if (n === null) return '';
      return dec.decode(buf.subarray(0, n));
    };
    const send = async (cmd: string) => { await conn!.write(enc.encode(cmd + '\r\n')); };

    await read(); // greeting
    await send(`EHLO ${settings.from_email.split('@')[1] || 'localhost'}`);
    const ehloResp = await read();

    if (settings.encryption === 'tls' && ehloResp.includes('STARTTLS')) {
      await send('STARTTLS');
      await read();
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await send(`EHLO ${settings.from_email.split('@')[1] || 'localhost'}`);
      await read();
    }

    await send('AUTH LOGIN');
    await read();
    await send(base64Ascii(settings.username));
    await read();
    await send(base64Ascii(settings.password));
    const authResp = await read();
    if (!authResp.startsWith('235')) {
      console.error('[SMTP] auth failed', authResp);
      try { conn.close(); } catch {}
      return false;
    }

    await send(`MAIL FROM:<${settings.from_email}>`);
    await read();
    await send(`RCPT TO:<${to}>`);
    await read();
    await send('DATA');
    await read();

    const subjectEncoded = `=?UTF-8?B?${base64Utf8(subject)}?=`;
    const fromHeader = `=?UTF-8?B?${base64Utf8(settings.from_name)}?= <${settings.from_email}>`;
    const message = [
      `From: ${fromHeader}`,
      `To: <${to}>`,
      `Subject: ${subjectEncoded}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Utf8(html),
      '.',
    ].join('\r\n');
    await send(message);
    const finalResp = await read();
    await send('QUIT');
    try { conn.close(); } catch {}
    return finalResp.startsWith('250');
  } catch (e) {
    console.error('[SMTP] error', e);
    try { conn?.close(); } catch {}
    return false;
  }
}

function emailHtml({ heading, lead, body, ctaText, ctaUrl }: { heading: string; lead: string; body: string; ctaText?: string; ctaUrl?: string }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;">
        <h1 style="margin:0;font-size:20px;">${heading}</h1>
        <p style="margin:6px 0 0;opacity:.9;font-size:13px;">${lead}</p>
      </div>
      <div style="padding:20px 24px;font-size:14px;line-height:1.55;">
        ${body}
        ${ctaUrl && ctaText ? `<p style="margin:24px 0 0;"><a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">${ctaText}</a></p>` : ''}
      </div>
      <div style="padding:14px 24px;background:#f8fafc;color:#64748b;font-size:11px;text-align:center;border-top:1px solid #e2e8f0;">
        Pure Life Center — „Testuję, nie zgaduję"
      </div>
    </div>
  </body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Today's date (Europe/Warsaw) as YYYY-MM-DD
  const todayWarsaw = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  // Pull all client-tests with at least one pending reminder due
  const { data: tests, error } = await supabase
    .from('omega_tests')
    .select('id, user_id, client_id, test_date, reminder_25d_enabled, reminder_25d_sent_at, reminder_120d_enabled, reminder_120d_sent_at, notify_partner_email, notify_client_email')
    .not('client_id', 'is', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const due: Array<{
    test_id: string;
    user_id: string;
    client_id: string;
    kind: '25d' | '120d';
    notify_partner_email: boolean;
    notify_client_email: boolean;
  }> = [];

  for (const t of tests ?? []) {
    const base = new Date(t.test_date + 'T00:00:00');
    const due25 = new Date(base); due25.setDate(due25.getDate() + 25);
    const due120 = new Date(base); due120.setDate(due120.getDate() + 120);
    const iso25 = due25.toISOString().slice(0, 10);
    const iso120 = due120.toISOString().slice(0, 10);

    if (t.reminder_25d_enabled && !t.reminder_25d_sent_at && iso25 <= todayWarsaw) {
      due.push({ test_id: t.id, user_id: t.user_id, client_id: t.client_id!, kind: '25d', notify_partner_email: t.notify_partner_email, notify_client_email: t.notify_client_email });
    }
    if (t.reminder_120d_enabled && !t.reminder_120d_sent_at && iso120 <= todayWarsaw) {
      due.push({ test_id: t.id, user_id: t.user_id, client_id: t.client_id!, kind: '120d', notify_partner_email: t.notify_partner_email, notify_client_email: t.notify_client_email });
    }
  }

  if (due.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Pre-load clients
  const clientIds = Array.from(new Set(due.map(d => d.client_id)));
  const { data: clientsData } = await supabase
    .from('omega_test_clients')
    .select('id, first_name, last_name, email')
    .in('id', clientIds);
  const clientById = new Map((clientsData ?? []).map((c: any) => [c.id, c]));

  // Pre-load partner emails
  const partnerIds = Array.from(new Set(due.map(d => d.user_id)));
  const { data: { users: partnerAuthUsers } = { users: [] } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const partnerEmailById = new Map<string, string>();
  for (const u of partnerAuthUsers ?? []) if (partnerIds.includes(u.id)) partnerEmailById.set(u.id, u.email ?? '');

  // SMTP settings
  const { data: smtp } = await supabase.from('smtp_settings').select('*').limit(1).maybeSingle();
  const smtpReady = !!(smtp && smtp.host && smtp.username && smtp.password && smtp.from_email);

  let processed = 0;
  for (const item of due) {
    const client: any = clientById.get(item.client_id);
    if (!client) continue;
    const fullName = `${client.first_name} ${client.last_name}`;

    const partnerTitle = item.kind === '25d'
      ? `Test Omega — odbierz wynik klienta ${fullName}`
      : `Test porównawczy Omega — czas na ponowne badanie (${fullName})`;
    const partnerMessage = item.kind === '25d'
      ? `Minęło 25 dni od testu klienta ${fullName}. Wynik powinien już być dostępny — skontaktuj się z klientem i wprowadź wartości w Bazie testów.`
      : `Minęły 4 miesiące (120 dni) od pierwszego testu klienta ${fullName}. To dobry moment na test porównawczy — pełen obraz efektu kuracji omega‑3.`;

    const logEntry = async (channel: 'in_app'|'email_partner'|'email_client', recipient: string|null, status: 'sent'|'failed'|'skipped', error?: string) => {
      try {
        await supabase.from('omega_test_reminder_log').insert({
          test_id: item.test_id,
          client_id: item.client_id,
          user_id: item.user_id,
          kind: item.kind,
          channel,
          recipient,
          status,
          error: error ?? null,
        });
      } catch (e) {
        console.error('[reminder-log] insert failed', e);
      }
    };

    // 1) In-app notification for the partner
    try {
      const { error: notifErr } = await supabase.from('user_notifications').insert({
        user_id: item.user_id,
        notification_type: item.kind === '25d' ? 'omega_test_pickup_due' : 'omega_test_comparative_due',
        source_module: 'omega_tests',
        title: partnerTitle,
        message: partnerMessage,
        link: '/moje-testy',
        metadata: { test_id: item.test_id, client_id: item.client_id, kind: item.kind },
      });
      await logEntry('in_app', null, notifErr ? 'failed' : 'sent', notifErr?.message);
    } catch (e) {
      console.error('[notif] insert failed', e);
      await logEntry('in_app', null, 'failed', String(e));
    }

    // 2) Email to partner
    if (!item.notify_partner_email) {
      await logEntry('email_partner', null, 'skipped', 'opt_out');
    } else if (!smtpReady) {
      await logEntry('email_partner', null, 'skipped', 'smtp_not_configured');
    } else {
      const partnerEmail = partnerEmailById.get(item.user_id);
      if (!partnerEmail) {
        await logEntry('email_partner', null, 'skipped', 'no_partner_email');
      } else {
        const html = emailHtml({
          heading: partnerTitle,
          lead: 'Przypomnienie z Bazy testów Omega',
          body: `<p>${partnerMessage}</p><p style="color:#475569;">Otwórz Bazę testów, aby zarządzać klientem i jego wynikami.</p>`,
          ctaText: 'Otwórz Bazę testów',
          ctaUrl: 'https://purelife.lovable.app/moje-testy',
        });
        const ok = await sendSmtp(smtp as SmtpSettings, partnerEmail, partnerTitle, html);
        await logEntry('email_partner', partnerEmail, ok ? 'sent' : 'failed', ok ? undefined : 'smtp_send_failed');
      }
    }

    // 3) Email to client (opt-in + email present)
    if (!item.notify_client_email) {
      await logEntry('email_client', null, 'skipped', 'opt_out');
    } else if (!smtpReady) {
      await logEntry('email_client', null, 'skipped', 'smtp_not_configured');
    } else if (!client.email) {
      await logEntry('email_client', null, 'skipped', 'no_client_email');
    } else {
      const clientSubject = item.kind === '25d'
        ? `Twój wynik testu Omega powinien być już gotowy`
        : `Czas na test porównawczy Omega‑3`;
      const clientBody = item.kind === '25d'
        ? `<p>Cześć ${client.first_name},</p>
           <p>Minęło 25 dni od wykonania testu Omega — Twój wynik powinien być już gotowy do pobrania.</p>
           <p>Sprawdź skrzynkę e-mail od laboratorium lub panel pacjenta, a następnie skontaktuj się ze mną, abyśmy wspólnie omówili wyniki.</p>`
        : `<p>Cześć ${client.first_name},</p>
           <p>Minęły 4 miesiące od Twojego pierwszego testu Omega. To idealny moment na test porównawczy — pełnych krwinek czerwonych nie da się oszukać 😉</p>
           <p>Razem zobaczymy realny efekt kuracji omega‑3 i zaplanujemy kolejne kroki.</p>`;
      const html = emailHtml({
        heading: clientSubject,
        lead: '„Testuję, nie zgaduję" — przypomnienie',
        body: clientBody,
      });
      const ok = await sendSmtp(smtp as SmtpSettings, client.email, clientSubject, html);
      await logEntry('email_client', client.email, ok ? 'sent' : 'failed', ok ? undefined : 'smtp_send_failed');
    }

    // 4) Mark as sent
    const updateField = item.kind === '25d' ? { reminder_25d_sent_at: new Date().toISOString() } : { reminder_120d_sent_at: new Date().toISOString() };
    await supabase.from('omega_tests').update(updateField).eq('id', item.test_id);
    processed++;
  }

  return new Response(JSON.stringify({ processed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
