import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InactivityWarningRequest {
  userId: string;
  daysInactive: number;
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

async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  const senderDomain = settings.from_email.split('@')[1] || 'localhost';
  console.log(`[SMTP] Sending inactivity warning to ${to}`);

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
      if (!hideLog) console.log('[SMTP] Sending:', command.trim().substring(0, 200));
      else console.log('[SMTP] Sending: [HIDDEN]');
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    await readResponse();
    await sendCommand(`EHLO ${senderDomain}`);

    if (settings.encryption === 'starttls') {
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${senderDomain}`);
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    
    if (!authResponse.startsWith('235')) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    const mailFromResp = await sendCommand(`MAIL FROM:<${settings.from_email}>`);
    if (!mailFromResp.startsWith('250')) throw new Error(`MAIL FROM rejected: ${mailFromResp}`);

    const rcptResp = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptResp.startsWith('250')) throw new Error(`RCPT TO rejected: ${rcptResp}`);

    const dataResp = await sendCommand('DATA');
    if (!dataResp.startsWith('354')) throw new Error(`DATA rejected: ${dataResp}`);

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${senderDomain}>`;
    const plainText = htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const emailContent = [
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
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
      `.`,
    ].join('\r\n');

    const sendResp = await sendCommand(emailContent);
    if (!sendResp.startsWith('250')) throw new Error(`Failed to send: ${sendResp}`);

    await sendCommand('QUIT');
    conn.close();

    console.log('[SMTP] Inactivity warning sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try { conn.close(); } catch {}
    }
  }
}

const PURE_LIFE_LOGO = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png';
function wrapWithBranding(html: string): string {
  const c = html.replace(/<!DOCTYPE[^>]*>/gi,'').replace(/<\/?html[^>]*>/gi,'').replace(/<head[\s\S]*?<\/head>/gi,'').replace(/<\/?body[^>]*>/gi,'');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#fff;"><div style="background:linear-gradient(135deg,#D4A843,#B8912A);padding:30px;text-align:center;"><img src="${PURE_LIFE_LOGO}" alt="Pure Life Center" style="max-width:180px;height:auto;"/></div><div style="padding:20px 30px;">${c}</div><div style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#888;"><p style="margin:0;">&copy; ${new Date().getFullYear()} Pure Life Center</p></div></div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, daysInactive }: InactivityWarningRequest = await req.json();
    console.log("[send-inactivity-warning] Request:", { userId, daysInactive });

    if (!userId) {
      throw new Error("Missing required parameter: userId");
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User not found");
    }

    // Get inactivity settings
    const { data: inactivitySettings } = await supabase
      .from("inactivity_settings")
      .select("block_days, support_email")
      .limit(1)
      .single();

    const blockDays = inactivitySettings?.block_days || 30;
    const supportEmail = inactivitySettings?.support_email || 'support@purelife.info.pl';
    const daysRemaining = Math.max(0, blockDays - (daysInactive || 14));

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      throw new Error("No active SMTP configuration found");
    }

    const smtpSettings: SmtpSettings = {
      host: smtpData.smtp_host,
      port: Number(smtpData.smtp_port),
      encryption: smtpData.smtp_encryption,
      username: smtpData.smtp_username,
      password: smtpData.smtp_password,
      from_email: smtpData.sender_email,
      from_name: smtpData.sender_name,
    };

    // Get APP_BASE_URL
    const { data: settingsData } = await supabase
      .from('page_settings')
      .select('app_base_url')
      .limit(1)
      .maybeSingle();
    
    const baseUrl = settingsData?.app_base_url || 'https://purelife.lovable.app';

    const firstName = profile.first_name || 'Użytkowniku';
    const subject = `⚠️ Twoje konto Pure Life Center — brak aktywności od ${daysInactive} dni`;

    const htmlBody = `
      <h2 style="color:#333;margin-bottom:15px;">Witaj ${firstName}!</h2>
      <p style="color:#555;line-height:1.6;">
        Zauważyliśmy, że od <strong>${daysInactive} dni</strong> nie logowałeś/aś się na platformie Pure Life Center.
      </p>
      <div style="background:#FFF3CD;border:1px solid #FFEAA7;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:#856404;margin:0;font-weight:bold;">⚠️ Ważna informacja</p>
        <p style="color:#856404;margin:8px 0 0 0;">
          Po <strong>${blockDays} dniach</strong> braku aktywności na platformie, dostęp do Twojego konta zostanie <strong>ograniczony</strong>. 
          Pozostało Ci <strong>${daysRemaining} dni</strong>.
        </p>
      </div>
      <p style="color:#555;line-height:1.6;">
        Aby zachować pełny dostęp, wystarczy <strong>zalogować się</strong> na platformę:
      </p>
      <div style="text-align:center;margin:25px 0;">
        <a href="${baseUrl}" style="background:linear-gradient(135deg,#D4A843,#B8912A);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
          Zaloguj się teraz
        </a>
      </div>
      <div style="background:#f0f0f0;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="color:#666;margin:0;font-size:14px;">
          <strong>Jak odblokować konto po ograniczeniu dostępu?</strong>
        </p>
        <ul style="color:#666;font-size:14px;margin:8px 0 0 0;padding-left:20px;">
          <li>Napisz na adres: <a href="mailto:${supportEmail}" style="color:#D4A843;">${supportEmail}</a></li>
          <li>Skontaktuj się ze swoim opiekunem</li>
          <li>Użyj formularza kontaktowego na stronie</li>
        </ul>
      </div>
      <p style="color:#888;font-size:13px;margin-top:20px;">
        Ta wiadomość została wysłana automatycznie przez system Pure Life Center.
      </p>
    `;

    // Send email
    const result = await sendSmtpEmail(smtpSettings, profile.email, subject, wrapWithBranding(htmlBody));

    // Log the email
    await supabase.from("email_logs").insert({
      recipient_email: profile.email,
      recipient_user_id: userId,
      subject: subject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        event: 'inactivity_warning',
        days_inactive: daysInactive,
        days_remaining: daysRemaining,
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    // Update inactivity_warning_sent_at
    await supabase
      .from("profiles")
      .update({ inactivity_warning_sent_at: new Date().toISOString() })
      .eq("user_id", userId);

    console.log("[send-inactivity-warning] Email sent successfully to:", profile.email);

    return new Response(
      JSON.stringify({ success: true, message: `Inactivity warning sent to ${profile.email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-inactivity-warning] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
