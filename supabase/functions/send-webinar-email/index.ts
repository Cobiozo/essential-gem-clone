import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebinarEmailRequest {
  type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'reminder_15min';
  email: string;
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  zoomLink?: string;
  hostName?: string;
  eventId?: string;
  registrationId?: string;
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

interface EmailTemplate {
  id: string;
  internal_name: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  is_active: boolean;
  variables: string[] | null;
}

function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return btoa(String.fromCharCode(...data));
}

function base64EncodeAscii(str: string): string {
  return btoa(str);
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

// Replace template variables with actual values
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    // Replace both {{key}} and {{key}} formats
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value || '');
  }
  return result;
}

async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; message: string }> {
  console.log(`[SMTP] Connecting to ${settings.host}:${settings.port}`);
  
  let conn: Deno.TcpConn | Deno.TlsConn;
  
  try {
    if (settings.encryption_type === "ssl") {
      conn = await withTimeout(
        Deno.connectTls({ hostname: settings.host, port: settings.port }),
        15000,
        "SSL/TLS connection timeout"
      );
    } else {
      conn = await withTimeout(
        Deno.connect({ hostname: settings.host, port: settings.port }),
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
      return decoder.decode(buffer.subarray(0, n));
    }

    async function sendCommand(command: string, hideLog = false): Promise<string> {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    }

    await readResponse();
    await sendCommand(`EHLO ${settings.host}`);

    if (settings.encryption_type === "starttls") {
      const starttlsResponse = await sendCommand("STARTTLS");
      if (!starttlsResponse.startsWith("220")) {
        throw new Error("STARTTLS not supported or failed");
      }
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${settings.host}`);
    }

    await sendCommand("AUTH LOGIN");
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    
    if (!authResponse.includes("235") && !authResponse.includes("Authentication successful")) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    await sendCommand(`MAIL FROM:<${settings.sender_email}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const emailContent = [
      `From: "${settings.sender_name}" <${settings.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
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

    await sendCommand("QUIT");
    conn.close();

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

// Map email type to template internal_name
function getTemplateInternalName(type: WebinarEmailRequest['type']): string {
  switch (type) {
    case 'confirmation':
      return 'webinar_confirmation';
    case 'reminder_24h':
      return 'webinar_reminder_24h';
    case 'reminder_1h':
      return 'webinar_reminder_1h';
    case 'reminder_15min':
      return 'webinar_reminder_15min';
    default:
      return 'webinar_confirmation';
  }
}

// Get event type key for logging
function getEventTypeKey(type: WebinarEmailRequest['type']): string {
  switch (type) {
    case 'confirmation':
      return 'webinar_confirmation';
    case 'reminder_24h':
      return 'webinar_reminder_24h';
    case 'reminder_1h':
      return 'webinar_reminder_1h';
    case 'reminder_15min':
      return 'webinar_reminder_15min';
    default:
      return 'webinar_confirmation';
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: WebinarEmailRequest = await req.json();
    const { type, email, firstName, eventTitle, eventDate, eventTime, zoomLink, hostName, eventId, registrationId } = requestData;
    
    console.log(`[send-webinar-email] Processing ${type} email for: ${email}, event: ${eventTitle}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get template from database
    const templateInternalName = getTemplateInternalName(type);
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", templateInternalName)
      .eq("is_active", true)
      .maybeSingle();

    if (templateError) {
      console.error("[send-webinar-email] Error fetching template:", templateError);
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    if (!template) {
      console.error(`[send-webinar-email] Template not found: ${templateInternalName}`);
      throw new Error(`Template not found: ${templateInternalName}`);
    }

    // Get event type for logging
    const eventTypeKey = getEventTypeKey(type);
    const { data: eventType } = await supabase
      .from("email_event_types")
      .select("id")
      .eq("event_key", eventTypeKey)
      .maybeSingle();

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      console.warn("[send-webinar-email] SMTP settings not found");
      return new Response(
        JSON.stringify({ success: false, error: "SMTP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpSettings: SmtpSettings = {
      host: smtpData.smtp_host,
      port: smtpData.smtp_port,
      username: smtpData.smtp_username,
      password: smtpData.smtp_password,
      encryption_type: smtpData.smtp_encryption,
      sender_email: smtpData.sender_email,
      sender_name: smtpData.sender_name,
    };

    // Prepare template variables
    const templateVariables: Record<string, string> = {
      'imię': firstName,
      'event_title': eventTitle,
      'event_date': eventDate,
      'event_time': eventTime,
      'host_name': hostName || 'Zespół Pure Life',
      'zoom_link': zoomLink || '',
    };

    // Replace variables in subject and body
    const finalSubject = replaceTemplateVariables(template.subject, templateVariables);
    const finalBody = replaceTemplateVariables(template.body_html, templateVariables);

    try {
      await sendSmtpEmail(smtpSettings, email, finalSubject, finalBody);
      
      // Log successful email
      await supabase.from("email_logs").insert({
        recipient_email: email,
        subject: finalSubject,
        status: "sent",
        sent_at: new Date().toISOString(),
        template_id: template.id,
        event_type_id: eventType?.id || null,
        metadata: { 
          type: type, 
          event_id: eventId,
          registration_id: registrationId,
          event_title: eventTitle 
        },
      });

      console.log(`[send-webinar-email] ${type} email sent successfully to ${email}`);
      
      return new Response(
        JSON.stringify({ success: true, message: `${type} email sent` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (sendError: any) {
      console.error("[send-webinar-email] SMTP error:", sendError);
      
      // Log failed email
      await supabase.from("email_logs").insert({
        recipient_email: email,
        subject: finalSubject,
        status: "failed",
        error_message: sendError.message,
        template_id: template.id,
        event_type_id: eventType?.id || null,
        metadata: { 
          type: type, 
          event_id: eventId,
          registration_id: registrationId,
        },
      });

      return new Response(
        JSON.stringify({ success: false, error: sendError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("[send-webinar-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
