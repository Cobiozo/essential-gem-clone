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
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
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
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} +0000`;
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
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    await readResponse(); // greeting

    await sendCommand(`EHLO ${settings.from_email.split('@')[1] || settings.host}`);

    if (settings.encryption === 'starttls') {
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${settings.from_email.split('@')[1] || settings.host}`);
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    if (!authResponse.startsWith('235')) throw new Error(`Auth failed: ${authResponse}`);

    const mailFromResp = await sendCommand(`MAIL FROM:<${settings.from_email}>`);
    if (!mailFromResp.startsWith('250')) throw new Error(`MAIL FROM rejected: ${mailFromResp}`);

    const rcptResp = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptResp.startsWith('250')) throw new Error(`RCPT TO rejected: ${rcptResp}`);

    const dataResp = await sendCommand('DATA');
    if (!dataResp.startsWith('354')) throw new Error(`DATA rejected: ${dataResp}`);

    const senderDomain = settings.from_email.split('@')[1] || 'localhost';
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const plainText = htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const emailContent = [
      `Message-ID: ${generateMessageId(senderDomain)}`,
      `Date: ${formatSmtpDate()}`,
      `From: "${settings.from_name}" <${settings.from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `Reply-To: <${settings.from_email}>`,
      `Return-Path: <${settings.from_email}>`,
      `X-Mailer: PureLife-Platform/1.0`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(plainText),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(htmlBody),
      ``,
      `--${boundary}--`,
      '.',
    ].join('\r\n');

    const sendResp = await sendCommand(emailContent);
    if (!sendResp.startsWith('250')) throw new Error(`Send failed: ${sendResp}`);

    await sendCommand('QUIT');
    conn.close();
    return { success: true };
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) { try { conn.close(); } catch {} }
  }
}

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

    const { subject, message } = await req.json();
    if (!message || message.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Message too short (min 10 characters)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, eq_id, email')
      .eq('user_id', user.id)
      .single();

    const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : user.email;
    const userEmail = profile?.email || user.email;
    const userEqId = profile?.eq_id || 'brak';

    // Get admin emails
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminUserIds = (adminRoles || []).map((r: any) => r.user_id);

    if (adminUserIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No administrators found' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminProfiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .in('user_id', adminUserIds);

    const adminEmails = (adminProfiles || []).map((p: any) => p.email).filter(Boolean);

    // Create notifications for admins
    const notifications = adminUserIds.map((adminId: string) => ({
      user_id: adminId,
      notification_type: 'system',
      source_module: 'mfa_support',
      title: `Zgłoszenie awaryjne MFA od ${userName}`,
      message: `${userName} (${userEmail}, EQ: ${userEqId}) zgłasza problem z MFA: ${message.substring(0, 200)}`,
      metadata: {
        ticket_user_id: user.id,
        ticket_user_email: userEmail,
        ticket_subject: subject || 'Problem z MFA',
        ticket_message: message,
      },
    }));

    await supabaseAdmin.from('user_notifications').insert(notifications);

    // Send email to admins via SMTP
    const { data: smtpData } = await supabaseAdmin
      .from('smtp_settings').select('*').eq('is_active', true).limit(1).single();

    if (smtpData && adminEmails.length > 0) {
      const smtpSettings: SmtpSettings = {
        host: smtpData.smtp_host,
        port: smtpData.smtp_port || 587,
        encryption: smtpData.smtp_encryption || 'starttls',
        username: smtpData.smtp_username,
        password: smtpData.smtp_password,
        from_email: smtpData.sender_email,
        from_name: smtpData.sender_name || 'Pure Life System',
      };

      const ticketSubject = subject || 'Problem z dostępem MFA';
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #dc2626; text-align: center;">🚨 Zgłoszenie awaryjne — MFA</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Użytkownik:</td><td style="padding: 8px;">${userName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Email:</td><td style="padding: 8px;">${userEmail}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">EQ ID:</td><td style="padding: 8px;">${userEqId}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #555;">Temat:</td><td style="padding: 8px;">${ticketSubject}</td></tr>
          </table>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #333; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">
            Zgłoszenie wygenerowane automatycznie z ekranu logowania MFA.
          </p>
        </div>
      `;

      // Send to first admin (to avoid SMTP issues with multiple recipients)
      for (const email of adminEmails) {
        await sendSmtpEmail(smtpSettings, email, `[MFA SUPPORT] ${ticketSubject}`, htmlBody);
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Support ticket sent' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-support-ticket error:', error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
