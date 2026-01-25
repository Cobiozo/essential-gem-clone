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

// Base64 encode for SMTP (handles UTF-8 characters)
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

serve(async (req) => {
  console.log('[send-password-reset] Request received:', req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();
    console.log('[send-password-reset] Request for email:', email);

    if (!email) {
      throw new Error("Email is required");
    }

    // Find user profile by email
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .eq("email", email)
      .single();

    // For security, always return success even if user not found
    if (profileError || !profileData) {
      console.log('[send-password-reset] User not found, returning success for security');
      return new Response(
        JSON.stringify({ success: true, message: "Jeśli konto istnieje, link do resetowania hasła został wysłany" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate recovery link using admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`
      }
    });

    if (linkError || !linkData) {
      console.error('[send-password-reset] Failed to generate recovery link:', linkError);
      throw new Error("Failed to generate recovery link");
    }

    const recoveryLink = linkData.properties?.action_link;
    console.log('[send-password-reset] Recovery link generated');

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

    // Validate SMTP settings
    if (!smtpSettings.host || !smtpSettings.port || !smtpSettings.username || !smtpSettings.password) {
      throw new Error("Incomplete SMTP configuration. Please check SMTP settings.");
    }

    console.log('[send-password-reset] SMTP config loaded:', {
      host: smtpSettings.host,
      port: smtpSettings.port,
      encryption: smtpSettings.encryption,
      from_email: smtpSettings.from_email
    });

    // Fetch email template by internal_name
    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", "password_reset")
      .eq("is_active", true)
      .single();

    if (templateError || !templateData) {
      console.error('[send-password-reset] Template not found:', templateError);
      throw new Error("Email template 'password_reset' not found or inactive");
    }

    // Build variables for replacement
    const variables: Record<string, string> = {
      imię: profileData.first_name || '',
      nazwisko: profileData.last_name || '',
      email: profileData.email,
      link_resetowania: recoveryLink || '',
      data: new Date().toLocaleDateString('pl-PL'),
      godzina: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    };

    // Replace variables in template
    const subject = replaceVariables(templateData.subject, variables);
    let htmlBody = replaceVariables(templateData.body_html, variables);
    
    if (templateData.footer_html) {
      htmlBody += replaceVariables(templateData.footer_html, variables);
    }

    // Send email via SMTP
    const result = await sendSmtpEmail(
      smtpSettings,
      profileData.email,
      subject,
      htmlBody
    );

    // Log the email
    await supabase.from("email_logs").insert({
      template_id: templateData.id,
      recipient_email: profileData.email,
      recipient_user_id: profileData.user_id,
      subject: subject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        action: 'password_reset',
        recovery_link_generated: !!recoveryLink
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    console.log('[send-password-reset] Email sent successfully to:', profileData.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Link do resetowania hasła został wysłany na podany adres email",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-password-reset] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
