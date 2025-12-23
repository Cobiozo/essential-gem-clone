import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationEmailRequest {
  event_type_id: string;
  recipient_user_id: string;
  payload?: Record<string, any>;
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
  console.log(`[SMTP] Attempting to send notification email to ${to}`);
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
    const emailContent = [
      `From: ${settings.from_name} <${settings.from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Encode(htmlBody),
      '.',
    ].join('\r\n');

    const dataResponse = await sendCommand(emailContent);
    
    if (!dataResponse.startsWith('250')) {
      throw new Error(`Failed to send email: ${dataResponse}`);
    }

    // QUIT
    await sendCommand('QUIT');
    conn.close();

    console.log('[SMTP] Notification email sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    if (conn) {
      try { conn.close(); } catch {}
    }
    return { success: false, error: error.message };
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

serve(async (req) => {
  console.log('[send-notification-email] Request received:', req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_type_id, recipient_user_id, payload = {} }: SendNotificationEmailRequest = await req.json();
    console.log('[send-notification-email] Request data:', { event_type_id, recipient_user_id, payload });

    // Fetch event type with email template info
    const { data: eventType, error: eventTypeError } = await supabase
      .from("notification_event_types")
      .select("*, email_template_id, send_email")
      .eq("id", event_type_id)
      .single();

    if (eventTypeError || !eventType) {
      console.log('[send-notification-email] Event type not found:', event_type_id);
      return new Response(
        JSON.stringify({ success: false, error: "Event type not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email sending is enabled for this event type
    if (!eventType.send_email || !eventType.email_template_id) {
      console.log('[send-notification-email] Email not configured for this event type');
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: "Email not configured for this event type" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      console.error('[send-notification-email] No active SMTP configuration found');
      return new Response(
        JSON.stringify({ success: false, error: "No active SMTP configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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

    // Validate SMTP settings
    if (!smtpSettings.host || !smtpSettings.port || !smtpSettings.username || !smtpSettings.password) {
      console.error('[send-notification-email] Incomplete SMTP configuration');
      return new Response(
        JSON.stringify({ success: false, error: "Incomplete SMTP configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch email template
    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", eventType.email_template_id)
      .single();

    if (templateError || !templateData) {
      console.error('[send-notification-email] Email template not found:', eventType.email_template_id);
      return new Response(
        JSON.stringify({ success: false, error: "Email template not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch recipient user data
    const { data: recipientData, error: recipientError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name, eq_id")
      .eq("user_id", recipient_user_id)
      .single();

    if (recipientError || !recipientData) {
      console.error('[send-notification-email] Recipient user not found:', recipient_user_id);
      return new Response(
        JSON.stringify({ success: false, error: "Recipient user not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user role
    const { data: recipientRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", recipient_user_id)
      .single();

    // Build variables for replacement
    const variables: Record<string, string> = {
      imię: recipientData.first_name || '',
      nazwisko: recipientData.last_name || '',
      email: recipientData.email,
      rola: recipientRole?.role || 'client',
      data: new Date().toLocaleDateString('pl-PL'),
      godzina: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      nazwa_zdarzenia: eventType.name || '',
      opis_zdarzenia: eventType.description || '',
      moduł: eventType.source_module || '',
      // Add payload variables
      ...(payload.message && { wiadomość: payload.message }),
      ...(payload.link && { link: payload.link }),
      ...(payload.title && { tytuł: payload.title }),
      // Spread any other payload properties as variables
      ...Object.fromEntries(
        Object.entries(payload)
          .filter(([k]) => typeof payload[k] === 'string')
          .map(([k, v]) => [k, v as string])
      ),
    };

    // Replace variables in template
    const subject = replaceVariables(templateData.subject, variables);
    let htmlBody = replaceVariables(templateData.body_html, variables);
    
    if (templateData.footer_html) {
      htmlBody += replaceVariables(templateData.footer_html, variables);
    }

    // Send email
    const result = await sendSmtpEmail(
      smtpSettings,
      recipientData.email,
      subject,
      htmlBody
    );

    // Log the email
    await supabase.from("email_logs").insert({
      template_id: eventType.email_template_id,
      recipient_email: recipientData.email,
      recipient_user_id: recipient_user_id,
      subject: subject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        event_type_id: event_type_id,
        event_key: eventType.event_key,
        payload 
      },
    });

    if (!result.success) {
      console.error('[send-notification-email] Failed to send email:', result.error);
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('[send-notification-email] Email sent successfully to:', recipientData.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email notification sent to ${recipientData.email}`,
        recipient: {
          email: recipientData.email,
          name: `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim(),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-notification-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
