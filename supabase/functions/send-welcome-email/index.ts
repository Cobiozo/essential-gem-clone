import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption_type: string;
  sender_email: string;
  sender_name: string;
}

// Base64 encoding - iterative (chunked) to avoid stack overflow on large bodies
function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64EncodeAscii(str: string): string {
  return btoa(str);
}

// Timeout utility
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

// SMTP email sending function
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; message: string }> {
  console.log(`[SMTP] Connecting to ${settings.host}:${settings.port} with encryption: ${settings.encryption_type}`);
  
  let conn: Deno.TcpConn | Deno.TlsConn;
  
  try {
    if (settings.encryption_type === "ssl") {
      console.log("[SMTP] Using SSL/TLS connection");
      conn = await withTimeout(
        Deno.connectTls({
          hostname: settings.host,
          port: settings.port,
        }),
        15000,
        "SSL/TLS connection timeout"
      );
    } else {
      console.log("[SMTP] Using plain TCP connection");
      conn = await withTimeout(
        Deno.connect({
          hostname: settings.host,
          port: settings.port,
        }),
        15000,
        "TCP connection timeout"
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n === null) return "";
      const response = decoder.decode(buffer.subarray(0, n));
      console.log(`[SMTP] <- ${response.trim()}`);
      return response;
    }

    async function sendCommand(command: string, hideLog = false): Promise<string> {
      if (hideLog) {
        console.log(`[SMTP] -> [HIDDEN COMMAND]`);
      } else {
        console.log(`[SMTP] -> ${command.trim()}`);
      }
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    }

    // Read greeting
    await readResponse();

    // EHLO
    await sendCommand(`EHLO ${settings.host}`);

    // STARTTLS for starttls encryption
    if (settings.encryption_type === "starttls") {
      console.log("[SMTP] Initiating STARTTLS upgrade");
      const starttlsResponse = await sendCommand("STARTTLS");
      if (!starttlsResponse.startsWith("220")) {
        throw new Error("STARTTLS not supported or failed");
      }

      conn = await Deno.startTls(conn as Deno.TcpConn, {
        hostname: settings.host,
      });
      console.log("[SMTP] TLS connection established");

      await sendCommand(`EHLO ${settings.host}`);
    }

    // AUTH LOGIN
    await sendCommand("AUTH LOGIN");
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    
    if (!authResponse.includes("235") && !authResponse.includes("Authentication successful")) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }
    console.log("[SMTP] Authentication successful");

    // MAIL FROM
    await sendCommand(`MAIL FROM:<${settings.sender_email}>`);

    // RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);

    // DATA
    await sendCommand("DATA");

    // Build email message
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${settings.host}>`;
    
    const emailContent = [
      `From: "${settings.sender_name}" <${settings.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `Return-Path: <${settings.sender_email}>`,
      `X-Mailer: PureLife-Platform/1.0`,
      `Reply-To: <${settings.sender_email}>`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(htmlBody.replace(/<[^>]*>/g, "")),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(htmlBody),
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    const dataResponse = await sendCommand(emailContent);
    
    if (!dataResponse.includes("250") && !dataResponse.includes("OK")) {
      throw new Error(`Failed to send email: ${dataResponse}`);
    }

    // QUIT
    await sendCommand("QUIT");
    conn.close();

    console.log("[SMTP] Email sent successfully");
    return { success: true, message: "Email sent successfully" };

  } catch (error) {
    console.error("[SMTP] Error:", error);
    throw error;
  } finally {
    if (conn) {
      try { conn.close(); } catch (closeError) {
        console.warn("[SMTP] Error closing connection:", closeError);
      }
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, firstName, lastName, role }: WelcomeEmailRequest = await req.json();
    
    console.log(`[send-welcome-email] Processing for user: ${email}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      console.error("[send-welcome-email] SMTP settings not found:", smtpError);
      throw new Error("SMTP settings not configured or inactive");
    }

    // Map SMTP settings from database columns
    const smtpSettings: SmtpSettings = {
      host: smtpData.smtp_host,
      port: smtpData.smtp_port,
      username: smtpData.smtp_username,
      password: smtpData.smtp_password,
      encryption_type: smtpData.smtp_encryption,
      sender_email: smtpData.sender_email,
      sender_name: smtpData.sender_name,
    };

    console.log(`[send-welcome-email] Using SMTP: ${smtpSettings.host}:${smtpSettings.port}`);

    // Get welcome_registration email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", "welcome_registration")
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("[send-welcome-email] Template not found:", templateError);
      throw new Error("Email template 'welcome_registration' not found or inactive");
    }

    console.log(`[send-welcome-email] Using template: ${template.name}`);

    // Build login link
    const siteUrl = "https://purelife.info.pl";
    const loginLink = `${siteUrl}/auth`;

    // Map role to Polish display name
    const roleDisplayNames: Record<string, string> = {
      admin: "Administrator",
      partner: "Partner",
      specjalista: "Specjalista",
      client: "Klient",
      user: "Użytkownik",
    };

    // Replace template variables
    let htmlBody = template.body_html;
    let subject = template.subject;

    const replacements: Record<string, string> = {
      "{{imię}}": firstName || "",
      "{{nazwisko}}": lastName || "",
      "{{email}}": email,
      "{{rola}}": roleDisplayNames[role] || role,
      "{{link_logowania}}": loginLink,
      "{{data}}": new Date().toLocaleDateString("pl-PL"),
    };

    for (const [key, value] of Object.entries(replacements)) {
      htmlBody = htmlBody.replace(new RegExp(key, "g"), value);
      subject = subject.replace(new RegExp(key, "g"), value);
    }

    // Add footer if exists
    if (template.footer_html) {
      htmlBody += template.footer_html;
    }

    // Log email attempt
    const { data: logEntry, error: logError } = await supabase
      .from("email_logs")
      .insert({
        recipient_email: email,
        recipient_user_id: userId,
        subject: subject,
        template_id: template.id,
        status: "pending",
        metadata: { type: "welcome_registration", role },
      })
      .select()
      .single();

    if (logError) {
      console.warn("[send-welcome-email] Failed to create log entry:", logError);
    }

    // Send email via SMTP
    try {
      await sendSmtpEmail(smtpSettings, email, subject, htmlBody);

      // Update log status
      if (logEntry) {
        await supabase
          .from("email_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", logEntry.id);
      }

      console.log(`[send-welcome-email] Successfully sent to ${email}`);

      return new Response(
        JSON.stringify({ success: true, message: "Welcome email sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (sendError: any) {
      console.error("[send-welcome-email] SMTP send failed:", sendError);

      // Update log with error
      if (logEntry) {
        await supabase
          .from("email_logs")
          .update({ status: "failed", error_message: sendError.message })
          .eq("id", logEntry.id);
      }

      throw sendError;
    }

  } catch (error: any) {
    console.error("[send-welcome-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
