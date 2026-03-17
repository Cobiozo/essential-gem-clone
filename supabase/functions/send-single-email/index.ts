import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  template_id?: string;
  recipient_user_id?: string;
  recipient_email?: string;
  subject?: string;
  html_body?: string;
  skip_template?: boolean;
  custom_variables?: Record<string, string>;
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
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[SMTP] Attempting to send email to ${to}`);
  console.log(`[SMTP] HTML body size: ${htmlBody.length} chars`);
  console.log(`[SMTP] Using server: ${settings.host}:${settings.port} (${settings.encryption})`);

  // Limit payload size to prevent SMTP hangs (max ~500KB of HTML)
  if (htmlBody.length > 500000) {
    console.error(`[SMTP] HTML body too large: ${htmlBody.length} chars`);
    return { success: false, error: 'Email content too large. Please reduce image size.' };
  }

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
        15000
      );
    } else {
      console.log('[SMTP] Connecting without encryption...');
      conn = await withTimeout(
        Deno.connect({
          hostname: settings.host,
          port: settings.port,
        }),
        15000
      );
    }

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const readPromise = conn!.read(buffer);
      const n = await withTimeout(readPromise, 15000);
      if (n === null) return '';
      const response = decoder.decode(buffer.subarray(0, n));
      console.log('[SMTP] Response:', response.trim());
      return response;
    };

    const sendCommand = async (command: string, hideLog = false): Promise<string> => {
      if (!hideLog) {
        console.log('[SMTP] Sending:', command.length > 200 ? `[${command.length} chars]` : command.trim());
      } else {
        console.log('[SMTP] Sending: [HIDDEN - credentials]');
      }
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    // Read initial greeting
    await readResponse();

    // EHLO
    const senderDomain = settings.from_email.split('@')[1] || 'localhost';
    await sendCommand(`EHLO ${senderDomain}`);

    // STARTTLS if needed
    if (settings.encryption === 'starttls') {
      console.log('[SMTP] Initiating STARTTLS...');
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, {
        hostname: settings.host,
      });
      await sendCommand(`EHLO ${senderDomain}`);
    }

    // AUTH LOGIN
    console.log('[SMTP] Authenticating...');
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

    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${senderDomain}>`;
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      '.',
    ].join('\r\n');

    console.log(`[SMTP] Sending DATA payload: ${emailContent.length} chars`);
    
    // Use longer timeout for DATA since it includes the full email content
    const sendData = async (): Promise<string> => {
      await conn!.write(encoder.encode(emailContent + '\r\n'));
      return await readResponse();
    };
    
    const dataResponse = await withTimeout(sendData(), 30000);
    
    if (!dataResponse.startsWith('250')) {
      throw new Error(`Failed to send email: ${dataResponse}`);
    }

    console.log('[SMTP] DATA accepted, sending QUIT');

    // QUIT
    try {
      await conn.write(encoder.encode('QUIT\r\n'));
    } catch { /* ignore quit errors */ }
    
    try { conn.close(); } catch { /* ignore */ }
    conn = null;

    console.log('[SMTP] Email sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try { conn.close(); } catch (closeError) {
        console.warn('[SMTP] Error closing connection:', closeError);
      }
    }
  }
}

// Replace template variables
function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

const PURE_LIFE_LOGO = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png';
function wrapWithBranding(html: string): string {
  const c = html.replace(/<!DOCTYPE[^>]*>/gi,'').replace(/<\/?html[^>]*>/gi,'').replace(/<head[\s\S]*?<\/head>/gi,'').replace(/<\/?body[^>]*>/gi,'');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#fff;"><div style="background:linear-gradient(135deg,#D4A843,#B8912A);padding:30px;text-align:center;"><img src="${PURE_LIFE_LOGO}" alt="Pure Life Center" style="max-width:180px;height:auto;"/></div><div style="padding:20px 30px;">${c}</div><div style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#888;"><p style="margin:0;">&copy; ${new Date().getFullYear()} Pure Life Center</p></div></div></body></html>`;
}

serve(async (req) => {
  console.log('[send-single-email] Request received:', req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { template_id, recipient_user_id, recipient_email, subject: directSubject, html_body, skip_template, custom_variables = {} }: SendEmailRequest = await req.json();
    console.log('[send-single-email] Request data:', { template_id, recipient_user_id, recipient_email, skip_template, html_body_length: html_body?.length });

    // For template-based mode, require admin role
    // For skip_template mode (e.g. skills assessment results), allow any authenticated user
    if (!skip_template) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        throw new Error("Only admins can send template emails");
      }
    }

    // Fetch SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      throw new Error("No active SMTP configuration found. Please configure SMTP settings first.");
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

    if (!smtpSettings.host || !smtpSettings.port || !smtpSettings.username || !smtpSettings.password) {
      throw new Error("Incomplete SMTP configuration. Please check SMTP settings.");
    }

    console.log('[send-single-email] SMTP config loaded:', {
      host: smtpSettings.host,
      port: smtpSettings.port,
      encryption: smtpSettings.encryption,
      from_email: smtpSettings.from_email
    });

    let finalEmail: string;
    let finalSubject: string;
    let finalHtml: string;
    let recipientName = '';

    if (skip_template && recipient_email && directSubject && html_body) {
      // Direct email mode — no template lookup
      finalEmail = recipient_email;
      finalSubject = directSubject;
      finalHtml = html_body;
    } else {
      // Template-based mode (original logic)
      if (!template_id || !recipient_user_id) {
        throw new Error("template_id and recipient_user_id are required for template mode");
      }

      const { data: templateData, error: templateError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", template_id)
        .single();

      if (templateError || !templateData) {
        throw new Error("Email template not found");
      }

      const { data: recipientData, error: recipientError } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, eq_id")
        .eq("user_id", recipient_user_id)
        .single();

      if (recipientError || !recipientData) {
        throw new Error("Recipient user not found");
      }

      const { data: recipientRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", recipient_user_id)
        .single();

      const variables: Record<string, string> = {
        imię: recipientData.first_name || '',
        nazwisko: recipientData.last_name || '',
        email: recipientData.email,
        rola: recipientRole?.role || 'client',
        data: new Date().toLocaleDateString('pl-PL'),
        godzina: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        link_aktywacyjny: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/`,
        link_resetowania: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`,
        ...custom_variables,
      };

      finalSubject = replaceVariables(templateData.subject, variables);
      finalHtml = replaceVariables(templateData.body_html, variables);
      if (templateData.footer_html) {
        finalHtml += replaceVariables(templateData.footer_html, variables);
      }
      finalEmail = recipientData.email;
      recipientName = `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim();
    }

    // Send email
    const result = await sendSmtpEmail(
      smtpSettings,
      finalEmail,
      finalSubject,
      wrapWithBranding(finalHtml)
    );

    // Log the email
    await supabase.from("email_logs").insert({
      template_id: template_id || null,
      recipient_email: finalEmail,
      recipient_user_id: recipient_user_id || null,
      subject: finalSubject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        forced_by_admin: user.id,
        skip_template: skip_template || false,
        custom_variables 
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    console.log('[send-single-email] Email sent successfully to:', finalEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email wysłany do ${finalEmail}`,
        recipient: {
          email: finalEmail,
          name: recipientName,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-single-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
