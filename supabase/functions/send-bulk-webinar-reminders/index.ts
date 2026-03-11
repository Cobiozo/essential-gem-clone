import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkReminderRequest {
  event_id: string;
  reminder_type?: "24h" | "12h" | "2h" | "1h" | "15min" | "auto";
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

// Reminder type config
const REMINDER_CONFIG: Record<string, {
  templateName: string;
  flagColumn: string;
  flagAtColumn: string;
  includeLink: boolean;
  eventTypeKey: string;
}> = {
  "24h": {
    templateName: "webinar_reminder_24h",
    flagColumn: "reminder_sent",
    flagAtColumn: "reminder_sent_at",
    includeLink: false,
    eventTypeKey: "webinar_reminder_24h",
  },
  "12h": {
    templateName: "webinar_reminder_12h",
    flagColumn: "reminder_12h_sent",
    flagAtColumn: "reminder_12h_sent_at",
    includeLink: false,
    eventTypeKey: "webinar_reminder_12h",
  },
  "2h": {
    templateName: "webinar_reminder_2h",
    flagColumn: "reminder_2h_sent",
    flagAtColumn: "reminder_2h_sent_at",
    includeLink: false,
    eventTypeKey: "webinar_reminder_2h",
  },
  "1h": {
    templateName: "webinar_reminder_1h",
    flagColumn: "reminder_1h_sent",
    flagAtColumn: "reminder_1h_sent_at",
    includeLink: true,
    eventTypeKey: "webinar_reminder_1h",
  },
  "15min": {
    templateName: "webinar_reminder_15min",
    flagColumn: "reminder_15min_sent",
    flagAtColumn: "reminder_15min_sent_at",
    includeLink: true,
    eventTypeKey: "webinar_reminder_15min",
  },
};

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
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
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
  htmlBody: string
): Promise<void> {
  let conn: Deno.TcpConn | Deno.TlsConn;

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

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
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
    await sendCommand(base64EncodeAscii(settings.username));
    const authResponse = await sendCommand(base64EncodeAscii(settings.password));

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
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

function determineReminderType(minutesUntilStart: number): string | null {
  // Pick the most appropriate reminder window (aligned with CRON every 5 min)
  if (minutesUntilStart <= 25 && minutesUntilStart >= 5) return "15min";
  if (minutesUntilStart <= 75 && minutesUntilStart >= 45) return "1h";
  if (minutesUntilStart <= 135 && minutesUntilStart >= 105) return "2h";
  if (minutesUntilStart <= 13 * 60 && minutesUntilStart >= 11 * 60) return "12h";
  if (minutesUntilStart <= 25 * 60 && minutesUntilStart >= 23 * 60) return "24h";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, reminder_type }: BulkReminderRequest = await req.json();

    if (!event_id) {
      return new Response(
        JSON.stringify({ success: false, error: "event_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, start_time, zoom_link, host_name, location")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ success: false, error: `Event not found: ${event_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Determine reminder type
    let resolvedType = reminder_type;
    if (!resolvedType || resolvedType === "auto") {
      const eventStart = new Date(event.start_time);
      const minutesUntilStart = (eventStart.getTime() - Date.now()) / 60000;
      resolvedType = determineReminderType(minutesUntilStart) as any;

      if (!resolvedType) {
        return new Response(
          JSON.stringify({ success: false, error: "No suitable reminder window for current time", minutesUntilStart }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const config = REMINDER_CONFIG[resolvedType];
    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown reminder_type: ${resolvedType}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bulk-reminders] Processing ${resolvedType} reminders for event: ${event.title} (${event_id})`);

    // 3. Get SMTP settings
    const { data: smtpData } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (!smtpData) {
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

    // 4. Get template
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", config.templateName)
      .eq("is_active", true)
      .maybeSingle();

    // 5. Get event type for logging
    const { data: eventType } = await supabase
      .from("email_event_types")
      .select("id")
      .eq("event_key", config.eventTypeKey)
      .maybeSingle();

    // 6. Get guests who haven't received this reminder yet
    // We need to use a dynamic filter on the flag column
    let guestsQuery = supabase
      .from("guest_event_registrations")
      .select("id, email, first_name, last_name")
      .eq("event_id", event_id)
      .eq("status", "registered")
      .eq(config.flagColumn, false);

    const { data: guests, error: guestsError } = await guestsQuery;

    if (guestsError) {
      console.error(`[bulk-reminders] Error fetching guests:`, guestsError);
      return new Response(
        JSON.stringify({ success: false, error: guestsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!guests || guests.length === 0) {
      console.log(`[bulk-reminders] No guests to remind (${resolvedType}) for: ${event.title}`);
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, skipped: 0, reminder_type: resolvedType }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bulk-reminders] Found ${guests.length} guests to send ${resolvedType} reminders`);

    // Format event date/time
    const eventDate = new Date(event.start_time);
    const formattedDate = eventDate.toLocaleDateString('pl-PL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Europe/Warsaw'
    });
    const formattedTime = eventDate.toLocaleTimeString('pl-PL', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
    }) + ' (Warsaw)';

    const zoomLink = event.zoom_link || event.location || '';

    // 6b. Warn admins if link is missing but this reminder type should include it
    if (!zoomLink && config.includeLink) {
      console.warn(`[bulk-reminders] Event "${event.title}" has no zoom_link or location for ${resolvedType} reminder. Notifying admins.`);
      try {
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');
        if (admins?.length) {
          await supabase.from('user_notifications').insert(
            admins.map((a: any) => ({
              user_id: a.user_id,
              notification_type: 'system',
              source_module: 'events',
              title: '⚠️ Brak linku do wydarzenia!',
              message: `Wydarzenie "${event.title}" nie ma skonfigurowanego linku Zoom ani lokalizacji. Przypomnienie ${resolvedType} zostanie wysłane do ${guests?.length || 0} uczestników BEZ linku do dołączenia.`,
              link: '/admin/events',
              metadata: { event_id: event_id, severity: 'warning', reminder_type: resolvedType, guests_count: guests?.length || 0 }
            }))
          );
        }
      } catch (warnErr) {
        console.error("[bulk-reminders] Failed to warn admins about missing link:", warnErr);
      }
    }

    // 7. Send emails in batches of 10
    const BATCH_SIZE = 10;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < guests.length; i += BATCH_SIZE) {
      const batch = guests.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (guest) => {
          // Prepare template variables
          const templateVariables: Record<string, string> = {
            'imię': guest.first_name || '',
            'event_title': event.title,
            'event_date': formattedDate,
            'event_time': formattedTime,
            'host_name': event.host_name || 'Zespół Pure Life',
            'zoom_link': config.includeLink ? zoomLink : '',
          };

          let finalSubject: string;
          let finalBody: string;

          if (template) {
            finalSubject = replaceTemplateVariables(template.subject, templateVariables);
            finalBody = replaceTemplateVariables(template.body_html, templateVariables);
          } else {
            // Fallback — generate subject/body based on type
            const typeLabels: Record<string, string> = {
              "24h": "jutro",
              "12h": "za 12 godzin",
              "2h": "za 2 godziny",
              "1h": "za godzinę",
              "15min": "za 15 minut",
            };
            const timeLabel = typeLabels[resolvedType as string] || "wkrótce";
            finalSubject = `⏰ Przypomnienie: ${event.title} — ${timeLabel}!`;
            finalBody = `
              <!DOCTYPE html>
              <html><head><meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f59e0b; }
                .content { padding: 30px 0; }
                .event-box { background: #fffbeb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; border-top: 1px solid #eee; }
                h1 { color: #d97706; margin: 0; }
                .join-button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              </style></head>
              <body><div class="container">
                <div class="header"><h1>⏰ Webinar ${timeLabel}!</h1></div>
                <div class="content">
                  <p>Cześć <strong>${guest.first_name || ''}</strong>!</p>
                  <p>Przypominamy o webinarze, który rozpocznie się <strong>${timeLabel}</strong>:</p>
                  <div class="event-box">
                    <h2 style="margin-top:0;">📅 ${event.title}</h2>
                    <p><strong>Data:</strong> ${formattedDate}</p>
                    <p><strong>Godzina:</strong> ${formattedTime}</p>
                    <p><strong>Prowadzący:</strong> ${event.host_name || 'Zespół Pure Life'}</p>
                    ${config.includeLink && zoomLink ? `
                      <p style="margin-top:20px;"><strong>🔗 Link do dołączenia:</strong></p>
                      <a href="${zoomLink}" class="join-button">Dołącz do webinaru</a>
                    ` : ''}
                  </div>
                  <p>Do zobaczenia! 🎉</p>
                </div>
                <div class="footer"><p>© ${new Date().getFullYear()} Pure Life.</p></div>
              </div></body></html>
            `;
          }

          // Send email
          await sendSmtpEmail(smtpSettings, guest.email, finalSubject, finalBody);

          // Log to email_logs
          await supabase.from("email_logs").insert({
            recipient_email: guest.email,
            subject: finalSubject,
            status: "sent",
            sent_at: new Date().toISOString(),
            template_id: template?.id || null,
            event_type_id: eventType?.id || null,
            metadata: {
              type: config.eventTypeKey,
              event_id: event_id,
              registration_id: guest.id,
              event_title: event.title,
              bulk_send: true,
            },
          });

          // Update flag
          const updateData: Record<string, any> = {
            [config.flagColumn]: true,
            [config.flagAtColumn]: new Date().toISOString(),
          };
          await supabase
            .from("guest_event_registrations")
            .update(updateData)
            .eq("id", guest.id);

          return guest.email;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          sent++;
        } else {
          failed++;
          console.error(`[bulk-reminders] Failed:`, result.reason);
        }
      }

      console.log(`[bulk-reminders] Batch ${Math.floor(i / BATCH_SIZE) + 1}: sent ${results.filter(r => r.status === 'fulfilled').length}, failed ${results.filter(r => r.status === 'rejected').length}`);
    }

    console.log(`[bulk-reminders] Completed ${resolvedType} for "${event.title}": sent=${sent}, failed=${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        reminder_type: resolvedType,
        event_title: event.title,
        sent,
        failed,
        total: guests.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[bulk-reminders] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
