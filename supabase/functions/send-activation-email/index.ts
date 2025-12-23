import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivationEmailRequest {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  resend?: boolean;
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
  console.log(`[SMTP] Attempting to send activation email to ${to}`);
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

    // AUTH LOGIN
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

    console.log('[SMTP] Activation email sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    if (conn) {
      try { conn.close(); } catch {}
    }
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData: ActivationEmailRequest = await req.json();
    
    console.log("[send-activation-email] Request:", { 
      userId: requestData.userId, 
      email: requestData.email,
      resend: requestData.resend 
    });

    // Check for duplicate sending (within last 5 minutes)
    if (!requestData.resend) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentLogs } = await supabase
        .from("email_logs")
        .select("id")
        .eq("recipient_email", requestData.email)
        .eq("status", "sent")
        .gte("sent_at", fiveMinutesAgo)
        .limit(1);

      if (recentLogs && recentLogs.length > 0) {
        console.log("[send-activation-email] Duplicate email prevented for:", requestData.email);
        return new Response(
          JSON.stringify({ success: true, message: "Email already sent recently" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      console.error("[send-activation-email] No active SMTP configuration found:", smtpError);
      throw new Error("Brak aktywnej konfiguracji SMTP");
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
      console.error("[send-activation-email] Incomplete SMTP configuration");
      throw new Error("Niekompletna konfiguracja SMTP");
    }

    // Get the activation email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", "activation_email")
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("[send-activation-email] Template not found:", templateError);
      throw new Error("Szablon e-mail aktywacyjnego nie został znaleziony");
    }

    // Generate activation token using Supabase Auth
    let activationLink = '';
    const redirectUrl = `${req.headers.get("origin") || "https://xzlhssqqbajqhnsmbucf.lovableproject.com"}/auth?activated=true`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: requestData.email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("[send-activation-email] Error generating activation link:", linkError);
      // If user already exists, generate magic link instead
      const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: requestData.email,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (magicLinkError) {
        throw new Error(`Nie można wygenerować linku aktywacyjnego: ${magicLinkError.message}`);
      }

      activationLink = magicLinkData.properties?.action_link || "";
    } else {
      activationLink = linkData.properties?.action_link || "";
    }

    // Replace template variables
    let htmlBody = template.body_html
      .replace(/\{\{imię\}\}/g, requestData.firstName || "Użytkowniku")
      .replace(/\{\{nazwisko\}\}/g, requestData.lastName || "")
      .replace(/\{\{email\}\}/g, requestData.email)
      .replace(/\{\{link_aktywacyjny\}\}/g, activationLink)
      .replace(/\{\{rola\}\}/g, requestData.role || "użytkownik");

    let subject = template.subject
      .replace(/\{\{imię\}\}/g, requestData.firstName || "Użytkowniku")
      .replace(/\{\{nazwisko\}\}/g, requestData.lastName || "");

    // Add footer if present
    if (template.footer_html) {
      htmlBody += template.footer_html;
    }

    // Get event type for logging
    const { data: eventType } = await supabase
      .from("email_event_types")
      .select("id")
      .eq("event_key", "user_registration")
      .single();

    // Create pending log entry
    const { data: logEntry, error: logError } = await supabase
      .from("email_logs")
      .insert({
        template_id: template.id,
        event_type_id: eventType?.id,
        recipient_email: requestData.email,
        recipient_user_id: requestData.userId || null,
        subject: subject,
        status: "pending",
        metadata: {
          firstName: requestData.firstName,
          lastName: requestData.lastName,
          role: requestData.role,
          isResend: requestData.resend || false,
        },
      })
      .select()
      .single();

    if (logError) {
      console.error("[send-activation-email] Error creating log entry:", logError);
    }

    // Send email using SMTP
    const result = await sendSmtpEmail(
      smtpSettings,
      requestData.email,
      subject,
      htmlBody
    );

    // Update log entry with result
    if (logEntry) {
      await supabase
        .from("email_logs")
        .update({
          status: result.success ? "sent" : "error",
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.error || null,
        })
        .eq("id", logEntry.id);
    }

    if (!result.success) {
      console.error("[send-activation-email] SMTP sending failed:", result.error);
      throw new Error(result.error || "Błąd podczas wysyłania e-maila");
    }

    console.log("[send-activation-email] Email sent successfully via SMTP");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "E-mail aktywacyjny został wysłany" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-activation-email] Error:", error);

    // Log error if possible
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const requestData: ActivationEmailRequest = await req.clone().json();
      
      await supabase.from("email_logs").insert({
        recipient_email: requestData.email,
        recipient_user_id: requestData.userId || null,
        subject: "Aktywuj swoje konto w Pure Life",
        status: "error",
        error_message: error.message,
        metadata: { error: error.message },
      });
    } catch (logError) {
      console.error("[send-activation-email] Failed to log email error:", logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
