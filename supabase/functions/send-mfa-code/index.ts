import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64EncodeAscii(str: string): string {
  return btoa(str);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

function generateMessageId(domain: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 12);
  return `<${timestamp}.${random}@${domain}>`;
}

function formatSmtpDate(): string {
  const d = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const mins = String(absOffset % 60).padStart(2, '0');
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} ${sign}${hours}${mins}`;
}

interface SmtpSettings {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[SMTP] Sending MFA code to ${to}`);
  let conn: Deno.Conn | null = null;
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (settings.encryption === 'ssl') {
      conn = await withTimeout(Deno.connectTls({ hostname: settings.host, port: settings.port }), 30000);
    } else {
      conn = await withTimeout(Deno.connect({ hostname: settings.host, port: settings.port }), 30000);
    }

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const n = await conn!.read(buffer);
      if (n === null) return '';
      return decoder.decode(buffer.subarray(0, n));
    };

    const sendCommand = async (command: string, hideLog = false): Promise<string> => {
      if (!hideLog) console.log('[SMTP] Sending:', command.trim().substring(0, 100));
      else console.log('[SMTP] Sending: [HIDDEN]');
      await conn!.write(encoder.encode(command + '\r\n'));
      const response = await readResponse();
      console.log('[SMTP] Response:', response.trim().substring(0, 200));
      return response;
    };

    const greeting = await readResponse();
    console.log('[SMTP] Greeting:', greeting.trim().substring(0, 200));

    await sendCommand(`EHLO ${settings.host}`);

    if (settings.encryption === 'starttls') {
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${settings.host}`);
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    if (!authResponse.startsWith('235')) throw new Error(`Auth failed: ${authResponse}`);

    const mailFromResp = await sendCommand(`MAIL FROM:<${settings.from_email}>`);
    if (!mailFromResp.startsWith('250')) throw new Error(`MAIL FROM rejected: ${mailFromResp}`);

    const rcptToResp = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptToResp.startsWith('250')) throw new Error(`RCPT TO rejected (recipient ${to}): ${rcptToResp}`);

    const dataResp = await sendCommand('DATA');
    if (!dataResp.startsWith('354')) throw new Error(`DATA command rejected: ${dataResp}`);

    const senderDomain = settings.from_email.split('@')[1] || 'localhost';

    const emailContent = [
      `Message-ID: ${generateMessageId(senderDomain)}`,
      `Date: ${formatSmtpDate()}`,
      `From: ${settings.from_name} <${settings.from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      `X-Mailer: PureLife-MFA/1.0`,
      '',
      base64Encode(htmlBody),
      '.',
    ].join('\r\n');

    const sendResp = await sendCommand(emailContent);
    if (!sendResp.startsWith('250')) throw new Error(`Send failed: ${sendResp}`);

    await sendCommand('QUIT');
    conn.close();
    console.log('[SMTP] MFA email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) { try { conn.close(); } catch {} }
  }
}

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_SENDS = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userEmail = user.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'No email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === RATE LIMITING: max 5 codes per 15 min ===
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: recentSends } = await supabaseAdmin
      .from('mfa_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'send_code')
      .gte('created_at', windowStart);

    if ((recentSends ?? 0) >= RATE_LIMIT_MAX_SENDS) {
      console.warn(`[MFA] Rate limit exceeded for user ${user.id}: ${recentSends} sends in ${RATE_LIMIT_WINDOW_MINUTES}min`);
      return new Response(JSON.stringify({ 
        error: 'Zbyt wiele prób. Odczekaj 15 minut przed kolejną próbą.',
        rate_limited: true 
      }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record rate limit entry
    await supabaseAdmin.from('mfa_rate_limits').insert({
      user_id: user.id,
      action_type: 'send_code',
    });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin.from('mfa_email_codes').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('[MFA] Failed to insert code:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to generate MFA code' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: smtpData } = await supabaseAdmin
      .from('smtp_settings').select('*').eq('is_active', true).limit(1).single();

    if (!smtpData) {
      return new Response(JSON.stringify({ error: 'SMTP not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const smtpSettings: SmtpSettings = {
      host: smtpData.smtp_host,
      port: smtpData.smtp_port || 587,
      encryption: smtpData.smtp_encryption || 'starttls',
      username: smtpData.smtp_username,
      password: smtpData.smtp_password,
      from_email: smtpData.sender_email,
      from_name: smtpData.sender_name || 'System',
    };

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a2e; text-align: center;">Weryfikacja logowania</h2>
        <p style="color: #555; text-align: center;">Twój jednorazowy kod weryfikacyjny:</p>
        <div style="background: #f0f4f8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
        </div>
        <p style="color: #888; text-align: center; font-size: 13px;">
          Kod jest ważny przez 5 minut. Nie udostępniaj go nikomu.
        </p>
        <p style="color: #aaa; text-align: center; font-size: 11px; margin-top: 24px;">
          Jeśli nie próbujesz się zalogować, zignoruj tę wiadomość.
        </p>
      </div>
    `;

    const result = await sendSmtpEmail(smtpSettings, userEmail, 'Weryfikacja logowania — Pure Life', emailHtml);

    if (!result.success) {
      console.error('[MFA] Failed to send email:', result.error);
      return new Response(JSON.stringify({ error: 'Failed to send MFA email: ' + result.error }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const masked = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    return new Response(JSON.stringify({ success: true, email: masked }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-mfa-code error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
