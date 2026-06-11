// Minimal SMTP sender shared across edge functions.
// Loads active smtp_settings and sends HTML mail via raw SMTP.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: string;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
}

function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
const base64Ascii = (s: string) => btoa(s);

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error(`Timeout ${ms}ms`)), ms))]);
}

async function rawSmtpSend(s: SmtpSettings, to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }>{
  let conn: Deno.Conn | null = null;
  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const senderDomain = s.from_email.split('@')[1] || 'localhost';

    conn = s.smtp_encryption === 'ssl'
      ? await withTimeout(Deno.connectTls({ hostname: s.smtp_host, port: s.smtp_port }), 30000)
      : await withTimeout(Deno.connect({ hostname: s.smtp_host, port: s.smtp_port }), 30000);

    const read = async () => {
      const buf = new Uint8Array(4096);
      const n = await conn!.read(buf);
      return n === null ? '' : dec.decode(buf.subarray(0, n));
    };
    const send = async (cmd: string) => { await conn!.write(enc.encode(cmd + '\r\n')); return await read(); };

    await read();
    await send(`EHLO ${senderDomain}`);
    if (s.smtp_encryption === 'starttls') {
      await send('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: s.smtp_host });
      await send(`EHLO ${senderDomain}`);
    }
    await send('AUTH LOGIN');
    await send(base64Ascii(s.smtp_username));
    const auth = await send(base64Ascii(s.smtp_password));
    if (!auth.startsWith('235')) throw new Error(`AUTH failed: ${auth}`);

    const mf = await send(`MAIL FROM:<${s.from_email}>`);
    if (!mf.startsWith('250')) throw new Error(`MAIL FROM: ${mf}`);
    const rc = await send(`RCPT TO:<${to}>`);
    if (!rc.startsWith('250')) throw new Error(`RCPT TO: ${rc}`);
    const da = await send('DATA');
    if (!da.startsWith('354')) throw new Error(`DATA: ${da}`);

    const boundary = `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const plain = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const body = [
      `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${senderDomain}>`,
      `Date: ${new Date().toUTCString()}`,
      `From: "${s.from_name}" <${s.from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `Reply-To: <${s.from_email}>`,
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
    ].join('\r\n');

    const r = await send(body);
    if (!r.includes('250')) throw new Error(`Send failed: ${r}`);
    await send('QUIT');
    return { success: true };
  } catch (e: any) {
    console.error('[smtp] error', e?.message);
    return { success: false, error: e?.message };
  } finally {
    if (conn) try { conn.close(); } catch {}
  }
}

export async function sendMail(opts: { to: string; subject: string; html: string }): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: smtp, error } = await supabase
    .from('smtp_settings')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (error || !smtp) return { success: false, error: 'No active SMTP settings' };
  return await rawSmtpSend(smtp as SmtpSettings, opts.to, opts.subject, opts.html);
}

export function brandedEmailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#222;margin:0;padding:0;background:#f5f5f5}
.container{max-width:600px;margin:0 auto;padding:0;background:#ffffff}
.header{background:linear-gradient(135deg,#f5c518,#d4a600);color:#000;padding:24px;}
.header h1{margin:0;font-size:20px;}
.content{padding:24px;color:#222}
.muted{color:#666;font-size:12px;padding:16px 24px;background:#fafafa;border-top:1px solid #eee}
</style></head><body><div class="container">
<div class="header"><h1>${title}</h1></div>
<div class="content">${bodyHtml}</div>
<div class="muted">Pure Life Center — wiadomość automatyczna.</div>
</div></body></html>`;
}
