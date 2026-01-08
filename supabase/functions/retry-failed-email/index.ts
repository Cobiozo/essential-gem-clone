import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetryEmailRequest {
  email_log_id: string;
  recipient_email: string;
  subject: string;
  template_id?: string;
  retry_count: number;
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

// Base64 encoding for SMTP auth
function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64EncodeAscii(str: string): string {
  return btoa(str);
}

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// Send email via SMTP
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  console.log(`[SMTP] Connecting to ${settings.host}:${settings.port} with encryption: ${settings.encryption_type}`);

  let conn: Deno.TcpConn | null = null;
  let secureConn: Deno.TlsConn | null = null;

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(reader: Deno.TcpConn | Deno.TlsConn): Promise<string> {
      const buffer = new Uint8Array(1024);
      const n = await withTimeout(reader.read(buffer), 30000);
      if (n === null) throw new Error("Connection closed");
      return decoder.decode(buffer.subarray(0, n));
    }

    async function sendCommand(
      writer: Deno.TcpConn | Deno.TlsConn,
      reader: Deno.TcpConn | Deno.TlsConn,
      command: string
    ): Promise<string> {
      const logCommand = command.startsWith("AUTH") ? "AUTH [credentials hidden]" : command.trim();
      console.log(`[SMTP] > ${logCommand}`);
      await writer.write(encoder.encode(command + "\r\n"));
      const response = await readResponse(reader);
      console.log(`[SMTP] < ${response.trim()}`);
      return response;
    }

    // SSL connection
    if (settings.encryption_type === "ssl") {
      secureConn = await withTimeout(
        Deno.connectTls({
          hostname: settings.host,
          port: settings.port,
        }),
        30000
      );

      const greeting = await readResponse(secureConn);
      console.log(`[SMTP] Greeting: ${greeting.trim()}`);

      await sendCommand(secureConn, secureConn, `EHLO localhost`);
      const authResponse = await sendCommand(
        secureConn,
        secureConn,
        `AUTH LOGIN`
      );

      if (authResponse.startsWith("334")) {
        await sendCommand(secureConn, secureConn, base64EncodeAscii(settings.username));
        await sendCommand(secureConn, secureConn, base64EncodeAscii(settings.password));
      }

      await sendCommand(secureConn, secureConn, `MAIL FROM:<${settings.sender_email}>`);
      await sendCommand(secureConn, secureConn, `RCPT TO:<${to}>`);
      await sendCommand(secureConn, secureConn, `DATA`);

      const emailContent = [
        `From: ${settings.sender_name} <${settings.sender_email}>`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        base64Encode(htmlBody),
        `.`,
      ].join("\r\n");

      await sendCommand(secureConn, secureConn, emailContent);
      await sendCommand(secureConn, secureConn, `QUIT`);
    } else {
      // STARTTLS or plain connection
      conn = await withTimeout(
        Deno.connect({
          hostname: settings.host,
          port: settings.port,
        }),
        30000
      );

      const greeting = await readResponse(conn);
      console.log(`[SMTP] Greeting: ${greeting.trim()}`);

      await sendCommand(conn, conn, `EHLO localhost`);

      if (settings.encryption_type === "starttls") {
        await sendCommand(conn, conn, `STARTTLS`);
        secureConn = await Deno.startTls(conn, { hostname: settings.host });
        conn = null;
        await sendCommand(secureConn, secureConn, `EHLO localhost`);
      }

      const activeConn = secureConn || conn;
      if (!activeConn) throw new Error("No active connection");

      const authResponse = await sendCommand(activeConn, activeConn, `AUTH LOGIN`);

      if (authResponse.startsWith("334")) {
        await sendCommand(activeConn, activeConn, base64EncodeAscii(settings.username));
        await sendCommand(activeConn, activeConn, base64EncodeAscii(settings.password));
      }

      await sendCommand(activeConn, activeConn, `MAIL FROM:<${settings.sender_email}>`);
      await sendCommand(activeConn, activeConn, `RCPT TO:<${to}>`);
      await sendCommand(activeConn, activeConn, `DATA`);

      const emailContent = [
        `From: ${settings.sender_name} <${settings.sender_email}>`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        base64Encode(htmlBody),
        `.`,
      ].join("\r\n");

      await sendCommand(activeConn, activeConn, emailContent);
      await sendCommand(activeConn, activeConn, `QUIT`);
    }

    console.log("[SMTP] Email sent successfully");
  } finally {
    // Always close connections
    if (secureConn) {
      try { secureConn.close(); } catch { /* ignore */ }
    }
    if (conn) {
      try { conn.close(); } catch { /* ignore */ }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_log_id, recipient_email, subject, template_id, retry_count }: RetryEmailRequest = await req.json();

    console.log(`[RETRY-EMAIL] Processing retry for email_log_id: ${email_log_id}, attempt: ${retry_count}`);

    // Initialize Supabase client with service role
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
      throw new Error("No active SMTP settings found");
    }

    // Get email template if template_id provided
    let htmlBody = "";
    if (template_id) {
      const { data: templateData, error: templateError } = await supabase
        .from("email_templates")
        .select("body_html")
        .eq("id", template_id)
        .single();

      if (templateError || !templateData) {
        throw new Error("Email template not found");
      }
      htmlBody = templateData.body_html;
    } else {
      // Get original email body from logs metadata
      const { data: logData } = await supabase
        .from("email_logs")
        .select("metadata")
        .eq("id", email_log_id)
        .single();

      htmlBody = logData?.metadata?.body_html || "<p>Email content unavailable</p>";
    }

    // Prepare SMTP settings with correct column names
    const smtpSettings: SmtpSettings = {
      host: smtpData.smtp_host,
      port: smtpData.smtp_port,
      username: smtpData.smtp_username,
      password: smtpData.smtp_password,
      encryption_type: smtpData.smtp_encryption,
      sender_email: smtpData.sender_email,
      sender_name: smtpData.sender_name,
    };

    // Send email
    await sendSmtpEmail(smtpSettings, recipient_email, subject, htmlBody);

    // Update email log status
    await supabase
      .from("email_logs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: null,
        metadata: { retry_count, retried_at: new Date().toISOString() },
      })
      .eq("id", email_log_id);

    console.log(`[RETRY-EMAIL] Successfully sent retry email to ${recipient_email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[RETRY-EMAIL] Error:", error.message);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
