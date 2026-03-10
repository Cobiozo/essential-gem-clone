import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption_type: string;
  sender_email: string;
  sender_name: string;
}

interface Attachment {
  filename: string;
  content_base64: string;
  content_type: string;
}

function base64Encode(str: string): string {
  const data = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i += 8192) {
    const chunk = data.subarray(i, i + 8192);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64EncodeAscii(str: string): string {
  return btoa(str);
}

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value || '');
  }
  return result;
}

async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: Attachment[]
): Promise<void> {
  let conn: Deno.TcpConn | Deno.TlsConn;

  if (settings.encryption_type === "ssl") {
    conn = await withTimeout(
      Deno.connectTls({ hostname: settings.host, port: settings.port }),
      15000, "SSL connection timeout"
    );
  } else {
    conn = await withTimeout(
      Deno.connect({ hostname: settings.host, port: settings.port }),
      15000, "TCP connection timeout"
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(8192);
    const n = await withTimeout(conn.read(buf), 30000, "SMTP read timeout");
    return n === null ? "" : decoder.decode(buf.subarray(0, n));
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse();
    await sendCommand(`EHLO ${settings.host}`);

    if (settings.encryption_type === "starttls") {
      const r = await sendCommand("STARTTLS");
      if (!r.startsWith("220")) throw new Error("STARTTLS failed");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${settings.host}`);
    }

    await sendCommand("AUTH LOGIN");
    await sendCommand(base64EncodeAscii(settings.username));
    const authRes = await sendCommand(base64EncodeAscii(settings.password));
    if (!authRes.includes("235") && !authRes.includes("Authentication successful")) {
      throw new Error(`Auth failed: ${authRes}`);
    }

    await sendCommand(`MAIL FROM:<${settings.sender_email}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const hasAttachments = attachments && attachments.length > 0;
    const mixedBoundary = `----=_Mixed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const headers = [
      `From: "${settings.sender_name}" <${settings.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `MIME-Version: 1.0`,
      `Date: ${new Date().toUTCString()}`,
    ];

    const parts: string[] = [];

    if (hasAttachments) {
      headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
      parts.push(...headers, ``);

      // Alternative part (text + html)
      parts.push(`--${mixedBoundary}`);
      parts.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
      parts.push(``);

      // Plain text
      parts.push(`--${altBoundary}`);
      parts.push(`Content-Type: text/plain; charset=UTF-8`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push(``);
      parts.push(base64Encode(htmlBody.replace(/<[^>]*>/g, "")));
      parts.push(``);

      // HTML
      parts.push(`--${altBoundary}`);
      parts.push(`Content-Type: text/html; charset=UTF-8`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push(``);
      parts.push(base64Encode(htmlBody));
      parts.push(``);
      parts.push(`--${altBoundary}--`);

      // Attachments
      for (const att of attachments!) {
        parts.push(``);
        parts.push(`--${mixedBoundary}`);
        parts.push(`Content-Type: ${att.content_type}; name="=?UTF-8?B?${base64Encode(att.filename)}?="`);
        parts.push(`Content-Transfer-Encoding: base64`);
        parts.push(`Content-Disposition: attachment; filename="=?UTF-8?B?${base64Encode(att.filename)}?="`);
        parts.push(``);
        // Split base64 into 76-char lines
        const b64 = att.content_base64;
        for (let i = 0; i < b64.length; i += 76) {
          parts.push(b64.substring(i, i + 76));
        }
      }

      parts.push(``);
      parts.push(`--${mixedBoundary}--`);
      parts.push(`.`);
    } else {
      // No attachments — simple multipart/alternative
      headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
      parts.push(...headers, ``);

      parts.push(`--${altBoundary}`);
      parts.push(`Content-Type: text/plain; charset=UTF-8`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push(``);
      parts.push(base64Encode(htmlBody.replace(/<[^>]*>/g, "")));
      parts.push(``);

      parts.push(`--${altBoundary}`);
      parts.push(`Content-Type: text/html; charset=UTF-8`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push(``);
      parts.push(base64Encode(htmlBody));
      parts.push(``);
      parts.push(`--${altBoundary}--`);
      parts.push(`.`);
    }

    const emailContent = parts.join("\r\n");
    const emailBytes = encoder.encode(emailContent + "\r\n");
    for (let i = 0; i < emailBytes.length; i += 16384) {
      await conn.write(emailBytes.subarray(i, i + 16384));
    }
    const dataRes = await withTimeout(readResponse(), 30000, "SMTP DATA timeout");
    if (!dataRes.includes("250") && !dataRes.includes("OK")) {
      throw new Error(`Send failed: ${dataRes}`);
    }

    await sendCommand("QUIT");
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, custom_message, attachments, recipient_group, single_recipient } = await req.json();
    if (!event_id) throw new Error("event_id is required");

    console.log(`[send-post-webinar-email] Starting for event: ${event_id}, group: ${recipient_group || 'all'}, attachments: ${attachments?.length || 0}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get event info
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("title, start_time, host_name")
      .eq("id", event_id)
      .single();

    if (eventError || !event) throw new Error("Event not found");

    // Get template
    const { data: template, error: tplErr } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", "webinar_followup")
      .eq("is_active", true)
      .maybeSingle();

    if (tplErr || !template) throw new Error("Template webinar_followup not found");

    // Get event type for logging
    const { data: eventType } = await supabase
      .from("email_event_types")
      .select("id")
      .eq("event_key", "webinar_followup")
      .maybeSingle();

    // Get SMTP settings
    const { data: smtpData, error: smtpErr } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpErr || !smtpData) throw new Error("SMTP not configured");

    const smtp: SmtpSettings = {
      host: smtpData.smtp_host,
      port: smtpData.smtp_port,
      username: smtpData.smtp_username,
      password: smtpData.smtp_password,
      encryption_type: smtpData.smtp_encryption,
      sender_email: smtpData.sender_email,
      sender_name: smtpData.sender_name,
    };

    // Collect all recipients based on recipient_group
    const group = recipient_group || 'all';
    interface Recipient { email: string; firstName: string; source: string }
    const recipients: Recipient[] = [];
    const seenEmails = new Set<string>();

    if (group === 'single' && single_recipient) {
      // Single recipient mode — skip DB queries
      recipients.push({
        email: single_recipient.email,
        firstName: single_recipient.first_name || 'Uczestnik',
        source: 'single',
      });
    } else {
      // 1. Platform users from event_registrations (if group is 'all' or 'users')
      if (group === 'all' || group === 'users') {
        const { data: regs } = await supabase
          .from("event_registrations")
          .select("user_id")
          .eq("event_id", event_id)
          .eq("status", "registered");

        if (regs && regs.length > 0) {
          const userIds = [...new Set(regs.map(r => r.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, email, first_name")
            .in("user_id", userIds);

          if (profiles) {
            for (const p of profiles) {
              if (p.email && !seenEmails.has(p.email.toLowerCase())) {
                seenEmails.add(p.email.toLowerCase());
                recipients.push({ email: p.email, firstName: p.first_name || 'Uczestnik', source: 'user' });
              }
            }
          }
        }
      }

      // 2. Guests from guest_event_registrations (if group is 'all' or 'guests')
      if (group === 'all' || group === 'guests') {
        const { data: guests } = await supabase
          .from("guest_event_registrations")
          .select("email, first_name, status")
          .eq("event_id", event_id)
          .in("status", ["registered", "attended"]);

        if (guests) {
          for (const g of guests) {
            if (g.email && !seenEmails.has(g.email.toLowerCase())) {
              seenEmails.add(g.email.toLowerCase());
              recipients.push({ email: g.email, firstName: g.first_name || 'Uczestnik', source: 'guest' });
            }
          }
        }
      }
    }

    console.log(`[send-post-webinar-email] ${recipients.length} unique recipients`);

    const eventDate = new Date(event.start_time).toLocaleDateString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    // Format custom_message as HTML block if provided
    const customMessageHtml = custom_message
      ? `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;"><p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0;">${custom_message.replace(/\n/g, '<br>')}</p></div>`
      : '';

    // Parse attachments
    const parsedAttachments: Attachment[] = (attachments || []).map((a: any) => ({
      filename: a.filename,
      content_base64: a.content_base64,
      content_type: a.content_type,
    }));

    let sent = 0;
    let failed = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const vars: Record<string, string> = {
            'imię': recipient.firstName,
            'event_title': event.title,
            'event_date': eventDate,
            'custom_message': customMessageHtml,
          };

          const finalSubject = replaceTemplateVariables(template.subject, vars);
          const finalBody = replaceTemplateVariables(template.body_html, vars);

          try {
            await sendSmtpEmail(smtp, recipient.email, finalSubject, finalBody, parsedAttachments);

            await supabase.from("email_logs").insert({
              recipient_email: recipient.email,
              subject: finalSubject,
              status: "sent",
              sent_at: new Date().toISOString(),
              template_id: template.id,
              event_type_id: eventType?.id || null,
              metadata: {
                type: "webinar_followup",
                event_id,
                source: recipient.source,
                event_title: event.title,
                attachments_count: parsedAttachments.length,
              },
            });

            return true;
          } catch (err: any) {
            console.error(`[send-post-webinar-email] Failed for ${recipient.email}:`, err.message);

            await supabase.from("email_logs").insert({
              recipient_email: recipient.email,
              subject: finalSubject,
              status: "failed",
              error_message: err.message,
              template_id: template.id,
              event_type_id: eventType?.id || null,
              metadata: {
                type: "webinar_followup",
                event_id,
                source: recipient.source,
              },
            });

            throw err;
          }
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') sent++;
        else failed++;
      }
    }

    console.log(`[send-post-webinar-email] Done: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: recipients.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-post-webinar-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
