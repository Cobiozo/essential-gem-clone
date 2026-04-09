import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatNotificationRequest {
  recipient_id: string;
  sender_name: string;
  message_content: string;
  message_type: string;
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

const PURE_LIFE_LOGO = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png';

function wrapWithBranding(html: string): string {
  const c = html.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '').replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<\/?body[^>]*>/gi, '');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#fff;"><div style="background:linear-gradient(135deg,#D4A843,#B8912A);padding:30px;text-align:center;"><img src="${PURE_LIFE_LOGO}" alt="Pure Life Center" style="max-width:180px;height:auto;"/></div><div style="padding:20px 30px;">${c}</div><div style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#888;"><p style="margin:0;">&copy; ${new Date().getFullYear()} Pure Life Center</p></div></div></body></html>`;
}

async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  const senderDomain = settings.from_email.split('@')[1] || 'localhost';
  console.log(`[SMTP] Sending chat notification to ${to}`);

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

    console.log('[SMTP] Chat notification sent successfully');
    return { success: true };
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try { conn.close(); } catch { /* already closed */ }
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_id, sender_name, message_content, message_type }: ChatNotificationRequest = await req.json();

    console.log("[send-chat-notification-email] Processing:", { recipient_id, sender_name, message_type });

    if (!recipient_id || !sender_name) {
      throw new Error("Missing required fields: recipient_id, sender_name");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has offline email notifications enabled and is offline
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("last_seen_at, email, first_name, last_name")
      .eq("user_id", recipient_id)
      .single();

    if (profileError || !profile) {
      console.error("[send-chat-notification-email] Profile not found:", profileError);
      return new Response(
        JSON.stringify({ success: false, reason: "profile_not_found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check notification preferences
    const { data: preferences } = await supabase
      .from("user_notification_preferences")
      .select("email_on_offline")
      .eq("user_id", recipient_id)
      .single();

    const emailEnabled = preferences?.email_on_offline ?? true;

    if (!emailEnabled) {
      console.log("[send-chat-notification-email] Email notifications disabled for user");
      return new Response(
        JSON.stringify({ success: false, reason: "email_disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is offline (last_seen_at > 5 minutes ago)
    const lastSeen = new Date(profile.last_seen_at || 0);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (lastSeen >= fiveMinutesAgo) {
      console.log("[send-chat-notification-email] User is online, skipping email");
      return new Response(
        JSON.stringify({ success: false, reason: "user_online" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // User is offline - try Push first, then email as fallback
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: recipient_id,
          title: `Wiadomość od ${sender_name}`,
          body: (message_type !== "text"
            ? `[${message_type === "image" ? "Zdjęcie" : message_type === "video" ? "Wideo" : message_type === "audio" ? "Wiadomość głosowa" : "Plik"}]`
            : message_content.substring(0, 100)),
          url: "/messages",
          tag: `chat-${Date.now()}`
        }
      });
      console.log("[send-chat-notification-email] Push notification sent to offline user");
    } catch (pushErr) {
      console.warn("[send-chat-notification-email] Push failed, continuing with email fallback:", pushErr);
    }

    // Send email as additional fallback via SMTP
    if (!profile.email) {
      console.error("[send-chat-notification-email] No email address for user");
      return new Response(
        JSON.stringify({ success: false, reason: "no_email" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      console.error("[send-chat-notification-email] No active SMTP configuration found");
      return new Response(
        JSON.stringify({ success: false, reason: "smtp_not_configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
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

    // Format message content based on type
    let displayContent = message_content;
    if (message_type !== "text") {
      const typeNames: Record<string, string> = {
        image: "zdjęcie",
        video: "wideo",
        audio: "wiadomość głosową",
        file: "plik",
      };
      displayContent = `[Wysłano ${typeNames[message_type] || "załącznik"}]`;
    } else if (message_content.length > 200) {
      displayContent = message_content.substring(0, 200) + "...";
    }

    const recipientName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Użytkowniku";
    const subject = `Nowa wiadomość od ${sender_name}`;

    const htmlBody = `
      <h2 style="color:#333;margin-bottom:15px;">Nowa wiadomość</h2>
      <p style="font-size:16px;margin-bottom:20px;color:#555;">
        Cześć <strong>${recipientName}</strong>,
      </p>
      <p style="font-size:15px;margin-bottom:20px;color:#555;">
        <strong>${sender_name}</strong> wysłał(a) Ci wiadomość:
      </p>
      <div style="background:#f8fafc;border-left:4px solid #D4A843;padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-style:italic;color:#374151;">
          "${displayContent}"
        </p>
      </div>
      <div style="text-align:center;margin-top:30px;">
        <a href="https://purelife.info.pl/messages"
           style="background:linear-gradient(135deg,#D4A843,#B8912A);color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
          Odpowiedz na wiadomość
        </a>
      </div>
      <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:20px;">
        Otrzymujesz tę wiadomość, ponieważ masz włączone powiadomienia email.<br>
        Możesz zmienić ustawienia w swoim profilu.
      </p>
    `;

    const result = await sendSmtpEmail(smtpSettings, profile.email, subject, wrapWithBranding(htmlBody));

    // Log the email
    await supabase.from("email_logs").insert({
      recipient_email: profile.email,
      recipient_user_id: recipient_id,
      subject: subject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: {
        event: 'chat_notification',
        sender_name: sender_name,
        message_type: message_type,
      },
    });

    if (!result.success) {
      console.error("[send-chat-notification-email] SMTP send failed:", result.error);
      return new Response(
        JSON.stringify({ success: false, reason: "smtp_error", error: result.error }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[send-chat-notification-email] Email sent successfully via SMTP to:", profile.email);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-chat-notification-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
