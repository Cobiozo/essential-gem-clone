import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: string;
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

// Base64 encode for SMTP AUTH (handles UTF-8 characters)
function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64 encode for simple ASCII strings (like credentials)
function base64EncodeAscii(str: string): string {
  return btoa(str);
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

// Send email via raw SMTP connection
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string,
  replyTo?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[SMTP] Attempting to send email to ${to}`);
  console.log(`[SMTP] Using server: ${settings.host}:${settings.port} (${settings.encryption})`);

  let conn: Deno.Conn | null = null;
  
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Connect based on encryption type
    if (settings.encryption === 'ssl') {
      console.log('[SMTP] Connecting with SSL/TLS...');
      conn = await withTimeout(
        Deno.connectTls({
          hostname: settings.host,
          port: settings.port,
        }),
        30000
      );
    } else {
      console.log('[SMTP] Connecting without encryption...');
      conn = await withTimeout(
        Deno.connect({
          hostname: settings.host,
          port: settings.port,
        }),
        30000
      );
    }

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const n = await conn!.read(buffer);
      if (n === null) return '';
      const response = decoder.decode(buffer.subarray(0, n));
      console.log('[SMTP] Response:', response.trim());
      return response;
    };

    const sendCommand = async (command: string, hideLog = false): Promise<string> => {
      if (!hideLog) {
        console.log('[SMTP] Sending:', command.trim());
      } else {
        console.log('[SMTP] Sending: [HIDDEN - credentials]');
      }
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    // Read initial greeting
    await readResponse();

    // EHLO
    await sendCommand(`EHLO ${settings.host}`);

    // STARTTLS if needed
    if (settings.encryption === 'starttls') {
      console.log('[SMTP] Initiating STARTTLS...');
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, {
        hostname: settings.host,
      });
      await sendCommand(`EHLO ${settings.host}`);
    }

    // AUTH LOGIN - use ASCII encoding for credentials
    console.log('[SMTP] Authenticating...');
    await sendCommand('AUTH LOGIN');
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    
    if (!authResponse.startsWith('235')) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    // MAIL FROM
    await sendCommand(`MAIL FROM:<${settings.from_email}>`);

    // RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);

    // DATA
    await sendCommand('DATA');

    // Email content with proper headers
    const emailHeaders = [
      `From: ${settings.from_name} <${settings.from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ];

    // Add Reply-To header if provided
    if (replyTo) {
      emailHeaders.push(`Reply-To: ${replyTo}`);
    }

    const emailContent = [
      ...emailHeaders,
      '',
      base64Encode(htmlBody),
      '.',
    ].join('\r\n');

    const dataResponse = await sendCommand(emailContent);
    
    if (!dataResponse.includes('250')) {
      throw new Error(`Failed to send email: ${dataResponse}`);
    }

    // QUIT
    await sendCommand('QUIT');

    return { success: true };
  } catch (error: any) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.log('[SMTP] Error closing connection:', e);
      }
    }
  }
}

serve(async (req) => {
  console.log('[send-support-email] Request received:', req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { name, email, subject, message, userId }: SupportEmailRequest = await req.json();
    console.log('[send-support-email] Request data:', { name, email, subject, userId });

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wszystkie pola są wymagane' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (smtpError || !smtpSettings) {
      console.error('[send-support-email] SMTP settings error:', smtpError);
      return new Response(
        JSON.stringify({ success: false, error: 'Brak konfiguracji SMTP' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('[send-support-email] SMTP config loaded:', {
      host: smtpSettings.host,
      port: smtpSettings.port,
      encryption: smtpSettings.encryption,
    });

    // Fetch support settings to get target email
    const { data: supportSettings } = await supabase
      .from('support_settings')
      .select('email_address')
      .limit(1)
      .maybeSingle();

    const targetEmail = supportSettings?.email_address || 'support@purelife.info.pl';
    console.log('[send-support-email] Target email:', targetEmail);

    // Build HTML email content
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f5c518, #d4a600); color: #000; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .field { margin-bottom: 15px; }
    .field-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .field-value { margin-top: 5px; padding: 10px; background: #fff; border-radius: 4px; border: 1px solid #e0e0e0; }
    .message-content { white-space: pre-wrap; }
    .footer { padding: 15px 20px; background: #f0f0f0; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📬 Nowa wiadomość z formularza wsparcia</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="field-label">Od</div>
        <div class="field-value">${name} &lt;${email}&gt;</div>
      </div>
      <div class="field">
        <div class="field-label">Temat</div>
        <div class="field-value">${subject}</div>
      </div>
      <div class="field">
        <div class="field-label">Wiadomość</div>
        <div class="field-value message-content">${message.replace(/\n/g, '<br>')}</div>
      </div>
      ${userId ? `
      <div class="field">
        <div class="field-label">ID użytkownika</div>
        <div class="field-value" style="font-family: monospace; font-size: 12px;">${userId}</div>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>Ta wiadomość została wysłana z formularza wsparcia technicznego Pure Life.</p>
      <p>Aby odpowiedzieć, użyj przycisku "Odpowiedz" - email zostanie wysłany do: ${email}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email via SMTP with Reply-To header
    const smtpResult = await sendSmtpEmail(
      {
        host: smtpSettings.host,
        port: smtpSettings.port,
        encryption: smtpSettings.encryption,
        username: smtpSettings.username,
        password: smtpSettings.password,
        from_email: smtpSettings.from_email,
        from_name: smtpSettings.from_name || 'Pure Life Support',
      },
      targetEmail,
      `[Wsparcie] ${subject}`,
      htmlBody,
      email // Reply-To will be the sender's email
    );

    if (!smtpResult.success) {
      console.error('[send-support-email] SMTP send failed:', smtpResult.error);
      return new Response(
        JSON.stringify({ success: false, error: smtpResult.error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log email in email_logs table
    await supabase.from('email_logs').insert({
      recipient_email: targetEmail,
      recipient_user_id: userId || null,
      subject: `[Wsparcie] ${subject}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        type: 'support_form',
        sender_name: name,
        sender_email: email,
        original_subject: subject,
      },
    });

    console.log('[send-support-email] Email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[send-support-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
