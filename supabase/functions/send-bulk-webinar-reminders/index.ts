import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { warsawLocalToUtc } from "../_shared/timezone-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkReminderRequest {
  event_id: string;
  reminder_type?: "24h" | "12h" | "2h" | "1h" | "15min" | "auto";
  occurrence_index?: number | null; // specific occurrence for cyclic events
  occurrence_datetime?: string; // ISO datetime of the specific term
  test_emails?: string[];
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
  includeLink: boolean;
  eventTypeKey: string;
}> = {
  "24h": { templateName: "webinar_reminder_24h", includeLink: false, eventTypeKey: "webinar_reminder_24h" },
  "12h": { templateName: "webinar_reminder_12h", includeLink: false, eventTypeKey: "webinar_reminder_12h" },
  "2h": { templateName: "webinar_reminder_2h", includeLink: true, eventTypeKey: "webinar_reminder_2h" },
  "1h": { templateName: "webinar_reminder_1h", includeLink: true, eventTypeKey: "webinar_reminder_1h" },
  "15min": { templateName: "webinar_reminder_15min", includeLink: true, eventTypeKey: "webinar_reminder_15min" },
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
    const senderDomain = settings.sender_email.split('@')[1] || 'localhost';
    await sendCommand(`EHLO ${senderDomain}`);

    if (settings.encryption_type === "starttls") {
      const starttlsResponse = await sendCommand("STARTTLS");
      if (!starttlsResponse.startsWith("220")) {
        throw new Error("STARTTLS not supported or failed");
      }
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${senderDomain}`);
    }

    await sendCommand("AUTH LOGIN");
    await sendCommand(base64EncodeAscii(settings.username));
    const authResponse = await sendCommand(base64EncodeAscii(settings.password));

    if (!authResponse.includes("235") && !authResponse.includes("Authentication successful")) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    const mailFromResp = await sendCommand(`MAIL FROM:<${settings.sender_email}>`);
    if (!mailFromResp.startsWith('250')) throw new Error(`MAIL FROM rejected: ${mailFromResp}`);
    const rcptResp = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptResp.startsWith('250')) throw new Error(`RCPT TO rejected: ${rcptResp}`);
    const dataResp = await sendCommand("DATA");
    if (!dataResp.startsWith('354')) throw new Error(`DATA rejected: ${dataResp}`);

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${senderDomain}>`;
    const plainText = htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const emailContent = [
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `From: "${settings.sender_name}" <${settings.sender_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `Reply-To: <${settings.sender_email}>`,
      `Return-Path: <${settings.sender_email}>`,
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
  if (minutesUntilStart <= 20 && minutesUntilStart >= 10) return "15min";
  if (minutesUntilStart <= 70 && minutesUntilStart >= 50) return "1h";
  if (minutesUntilStart <= 130 && minutesUntilStart >= 110) return "2h";
  if (minutesUntilStart <= 740 && minutesUntilStart >= 700) return "12h";
  if (minutesUntilStart <= 1460 && minutesUntilStart >= 1420) return "24h";
  return null;
}

const PURE_LIFE_LOGO = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png';
function wrapWithBranding(html: string): string {
  const c = html.replace(/<!DOCTYPE[^>]*>/gi,'').replace(/<\/?html[^>]*>/gi,'').replace(/<head[\s\S]*?<\/head>/gi,'').replace(/<\/?body[^>]*>/gi,'');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#fff;"><div style="background:linear-gradient(135deg,#D4A843,#B8912A);padding:30px;text-align:center;"><img src="${PURE_LIFE_LOGO}" alt="Pure Life Center" style="max-width:180px;height:auto;"/></div><div style="padding:20px 30px;">${c}</div><div style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#888;"><p style="margin:0;">&copy; ${new Date().getFullYear()} Pure Life Center</p></div></div></body></html>`;
}

function buildFallbackBody(
  resolvedType: string,
  firstName: string,
  event: any,
  formattedDate: string,
  formattedTime: string,
  zoomLink: string,
  includeLink: boolean,
): string {
  const typeLabels: Record<string, string> = {
    "24h": "jutro", "12h": "za 12 godzin", "2h": "za 2 godziny",
    "1h": "za godzinę", "15min": "za 15 minut",
  };
  const timeLabel = typeLabels[resolvedType] || "wkrótce";
  return `
    <!DOCTYPE html><html><head><meta charset="UTF-8">
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
        <p>Cześć <strong>${firstName || ''}</strong>!</p>
        <p>Przypominamy o webinarze, który rozpocznie się <strong>${timeLabel}</strong>:</p>
        <div class="event-box">
          <h2 style="margin-top:0;">📅 ${event.title}</h2>
          <p><strong>Data:</strong> ${formattedDate}</p>
          <p><strong>Godzina:</strong> ${formattedTime}</p>
          <p><strong>Prowadzący:</strong> ${event.host_name || 'Zespół Pure Life'}</p>
          ${event.category === 'team_training' ? `
            <div style="background:#e0f2fe;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #0284c7;">
              <p style="margin:0;font-weight:bold;color:#0369a1;">🔐 Wejście na to spotkanie odbywa się przez Twoje konto na Platformie Pure Life Center</p>
              <p style="margin:8px 0 0;"><a href="https://purelife.lovable.app/events" style="color:#0284c7;font-weight:bold;">Przejdź do Platformy →</a></p>
            </div>
          ` : ''}
          ${includeLink && zoomLink ? `
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, reminder_type, occurrence_index, occurrence_datetime, test_emails }: BulkReminderRequest = await req.json();
    const isTestMode = Array.isArray(test_emails) && test_emails.length > 0;

    if (isTestMode) {
      console.log(`[bulk-reminders] ⚠️ TEST MODE: sending only to ${test_emails!.length} addresses`);
    }

    if (!event_id) {
      return new Response(
        JSON.stringify({ success: false, error: "event_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get event details (including occurrences)
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, start_time, end_time, zoom_link, host_name, location, occurrences")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ success: false, error: `Event not found: ${event_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the actual datetime for this specific term
    let termDatetime: Date;
    let termOccurrenceIndex: number | null = occurrence_index ?? null;

    if (occurrence_datetime) {
      // Explicit datetime passed by scheduler
      termDatetime = new Date(occurrence_datetime);
    } else if (termOccurrenceIndex !== null && termOccurrenceIndex !== undefined && event.occurrences) {
      // Resolve from occurrences array
      let occs: any[] = [];
      if (Array.isArray(event.occurrences)) occs = event.occurrences;
      else if (typeof event.occurrences === 'string') {
        try { occs = JSON.parse(event.occurrences); } catch { occs = []; }
      }
      if (termOccurrenceIndex < occs.length) {
        const occ = occs[termOccurrenceIndex];
        // DST-aware: parse Warsaw local time to correct UTC
        termDatetime = warsawLocalToUtc(occ.date, occ.time);
      } else {
        termDatetime = new Date(event.start_time);
      }
    } else {
      // Single-occurrence event
      termDatetime = new Date(event.start_time);
    }

    // 2. Determine reminder type
    let resolvedType = reminder_type;
    if (!resolvedType || resolvedType === "auto") {
      const minutesUntilStart = (termDatetime.getTime() - Date.now()) / 60000;
      resolvedType = determineReminderType(minutesUntilStart) as any;

      if (!resolvedType) {
        return new Response(
          JSON.stringify({ success: false, error: "No suitable reminder window", minutesUntilStart }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const config = REMINDER_CONFIG[resolvedType as string];
    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown reminder_type: ${resolvedType}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bulk-reminders] Processing ${resolvedType} for event: ${event.title}, occurrence_index=${termOccurrenceIndex}, term=${termDatetime.toISOString()}`);

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

    // Format date/time for the SPECIFIC TERM (not base event start_time)
    const formattedDate = termDatetime.toLocaleDateString('pl-PL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Europe/Warsaw'
    });
    const formattedTime = termDatetime.toLocaleTimeString('pl-PL', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
    }) + ' (Warsaw)';

    const zoomLink = event.zoom_link || event.location || '';

    // ==========================================
    // 6. Check which recipients already got this reminder (deduplicate via occurrence_reminders_sent)
    // ==========================================
    const { data: alreadySent } = await supabase
      .from("occurrence_reminders_sent")
      .select("recipient_email")
      .eq("event_id", event_id)
      .eq("reminder_type", resolvedType as string)
      .eq("occurrence_datetime", termDatetime.toISOString());

    const alreadySentEmails = new Set((alreadySent || []).map(r => r.recipient_email.toLowerCase()));
    console.log(`[bulk-reminders] Already sent ${resolvedType} to ${alreadySentEmails.size} recipients for this term`);

    // ==========================================
    // 7a. Get GUEST registrations
    // ==========================================
    let guestQuery = supabase
      .from("guest_event_registrations")
      .select("id, email, first_name, last_name, occurrence_index, occurrence_date, occurrence_time, created_at")
      .eq("event_id", event_id)
      .eq("status", "registered");

    const { data: allGuests, error: guestsError } = await guestQuery;

    // For cyclic events, filter guests by occurrence_date/occurrence_time (stable snapshots)
    let guests = allGuests || [];
    if (termOccurrenceIndex !== null && event.occurrences) {
      const occs = Array.isArray(event.occurrences) ? event.occurrences : [];
      if (occs.length > 1) {
        const targetOcc = occs[termOccurrenceIndex];
        if (targetOcc) {
          const targetDate = targetOcc.date;
          const targetTime = targetOcc.time;
          const beforeCount = guests.length;
          guests = guests.filter((g: any) =>
            // Match by stable date+time snapshot (preferred)
            (g.occurrence_date === targetDate && g.occurrence_time === targetTime) ||
            // Fallback: legacy index-only match (no date stored)
            (g.occurrence_date === null && g.occurrence_index === termOccurrenceIndex)
          );
          console.log(`[bulk-reminders] Guest filtering for occurrence ${termOccurrenceIndex} (${targetDate} ${targetTime}): ${beforeCount} total → ${guests.length} matched, ${beforeCount - guests.length} filtered out`);
        }
      }
    }

    // For single-occurrence events (no occurrences array), filter out stale registrations
    // These are guests who registered for a previous date before admin updated start_time
    if (!event.occurrences || !Array.isArray(event.occurrences) || event.occurrences.length === 0) {
      const registrationWindowMs = 8 * 24 * 60 * 60 * 1000; // 8 days
      const cutoffDate = new Date(termDatetime.getTime() - registrationWindowMs);
      const beforeCount = guests.length;
      guests = guests.filter((g: any) => new Date(g.created_at) >= cutoffDate);
      if (beforeCount !== guests.length) {
        console.log(`[bulk-reminders] Single-occurrence stale guest filter: ${beforeCount} → ${guests.length} (removed ${beforeCount - guests.length} old registrations, cutoff: ${cutoffDate.toISOString()})`);
      }
    }

    if (guestsError) {
      console.error(`[bulk-reminders] Error fetching guests:`, guestsError);
    }

    // ==========================================
    // 7b. Get REGISTERED USER registrations
    // ==========================================
    const { data: userRegs, error: userRegsError } = await supabase
      .from("event_registrations")
      .select("id, user_id, occurrence_index, occurrence_date, occurrence_time, registered_at")
      .eq("event_id", event_id)
      .eq("status", "registered");

    if (userRegsError) {
      console.error(`[bulk-reminders] Error fetching user registrations:`, userRegsError);
    }

    // For cyclic events, filter user registrations to only those matching this occurrence
    // Uses stable date/time snapshot instead of potentially drifted occurrence_index
    let relevantUserRegs = userRegs || [];
    if (termOccurrenceIndex !== null && event.occurrences) {
      const occs = Array.isArray(event.occurrences) ? event.occurrences : [];
      
      if (occs.length > 1) {
        // Multi-occurrence: filter by stable date+time, fallback to index for legacy rows
        const targetOcc = occs[termOccurrenceIndex];
        if (targetOcc) {
          const targetDate = targetOcc.date;
          const targetTime = targetOcc.time;
          const beforeUserCount = relevantUserRegs.length;
          relevantUserRegs = relevantUserRegs.filter(r =>
            // Match by stable date+time snapshot
            (r.occurrence_date === targetDate && r.occurrence_time === targetTime) ||
            // Fallback: legacy index-only match (no date stored)
            (r.occurrence_date === null && r.occurrence_index === termOccurrenceIndex)
          );
          console.log(`[bulk-reminders] User reg filtering for occurrence ${termOccurrenceIndex} (${targetDate} ${targetTime}): ${beforeUserCount} total → ${relevantUserRegs.length} matched, ${beforeUserCount - relevantUserRegs.length} filtered out`);
        }
      }
      // Single occurrence: take all registered users (no index filtering)
    }

    // For single-occurrence events, filter out stale user registrations
    if (!event.occurrences || !Array.isArray(event.occurrences) || event.occurrences.length === 0) {
      const registrationWindowMs = 8 * 24 * 60 * 60 * 1000; // 8 days
      const cutoffDate = new Date(termDatetime.getTime() - registrationWindowMs);
      const beforeCount = relevantUserRegs.length;
      relevantUserRegs = relevantUserRegs.filter((r: any) => new Date(r.registered_at) >= cutoffDate);
      if (beforeCount !== relevantUserRegs.length) {
        console.log(`[bulk-reminders] Single-occurrence stale user reg filter: ${beforeCount} → ${relevantUserRegs.length} (removed ${beforeCount - relevantUserRegs.length} old registrations)`);
      }
    }

    // Deduplicate by user_id (one user may have multiple regs for same occurrence)
    const seenUserIds = new Set<string>();
    const uniqueUserRegs = relevantUserRegs.filter(r => {
      if (seenUserIds.has(r.user_id)) return false;
      seenUserIds.add(r.user_id);
      return true;
    });

    // Fetch profiles
    interface UserRecipient {
      registrationId: string;
      userId: string;
      email: string;
      firstName: string;
    }
    const userRecipients: UserRecipient[] = [];

    if (uniqueUserRegs.length > 0) {
      const userIds = uniqueUserRegs.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, first_name")
        .in("user_id", userIds);

      if (profiles) {
        for (const reg of uniqueUserRegs) {
          const profile = profiles.find(p => p.user_id === reg.user_id);
          if (profile?.email) {
            if (isTestMode && !test_emails!.includes(profile.email)) continue;
            userRecipients.push({
              registrationId: reg.id,
              userId: reg.user_id,
              email: profile.email,
              firstName: profile.first_name || '',
            });
          }
        }
      }
    }

    // Filter guests in test mode
    let filteredGuests = guests || [];
    if (isTestMode && guests) {
      filteredGuests = guests.filter(g => test_emails!.includes(g.email));
    }

    // ==========================================
    // 8. Build unified recipient list, excluding already sent
    // ==========================================
    interface Recipient {
      email: string;
      firstName: string;
      sourceTable: 'guest' | 'user';
      sourceId: string;
      userId?: string;
    }

    const allRecipients: Recipient[] = [];

    // Add guests (deduplicated by email)
    const addedEmails = new Set<string>();
    for (const g of filteredGuests) {
      const emailLower = g.email.toLowerCase();
      if (alreadySentEmails.has(emailLower) || addedEmails.has(emailLower)) continue;
      addedEmails.add(emailLower);
      allRecipients.push({
        email: g.email,
        firstName: g.first_name || '',
        sourceTable: 'guest',
        sourceId: g.id,
      });
    }

    // Add registered users
    for (const u of userRecipients) {
      const emailLower = u.email.toLowerCase();
      if (alreadySentEmails.has(emailLower) || addedEmails.has(emailLower)) continue;
      addedEmails.add(emailLower);
      allRecipients.push({
        email: u.email,
        firstName: u.firstName,
        sourceTable: 'user',
        sourceId: u.registrationId,
        userId: u.userId,
      });
    }

    const totalGuests = allRecipients.filter(r => r.sourceTable === 'guest').length;
    const totalUsers = allRecipients.filter(r => r.sourceTable === 'user').length;
    const totalRecipients = allRecipients.length;

    if (totalRecipients === 0) {
      console.log(`[bulk-reminders] No recipients for ${resolvedType} (event: ${event.title}, term: ${termDatetime.toISOString()})`);
      return new Response(
        JSON.stringify({ success: true, sent: 0, failed: 0, total: 0, reminder_type: resolvedType }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bulk-reminders] Found ${totalGuests}G + ${totalUsers}U = ${totalRecipients} recipients for ${resolvedType}`);

    // Warn admins if link is missing but should be included
    if (!zoomLink && config.includeLink) {
      console.warn(`[bulk-reminders] Event "${event.title}" has no zoom_link for ${resolvedType} reminder.`);
      try {
        const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
        if (admins?.length) {
          await supabase.from('user_notifications').insert(
            admins.map((a: any) => ({
              user_id: a.user_id,
              notification_type: 'system',
              source_module: 'events',
              title: '⚠️ Brak linku do wydarzenia!',
              message: `Wydarzenie "${event.title}" nie ma linku. Przypomnienie ${resolvedType} wysyłane do ${totalRecipients} uczestników BEZ linku.`,
              link: '/admin/events',
              metadata: { event_id, severity: 'warning', reminder_type: resolvedType }
            }))
          );
        }
      } catch (warnErr) {
        console.error("[bulk-reminders] Failed to warn admins:", warnErr);
      }
    }

    // ==========================================
    // 9. Send emails in batches
    // ==========================================
    const BATCH_SIZE = 25;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < allRecipients.length; i += BATCH_SIZE) {
      const batch = allRecipients.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const templateVariables: Record<string, string> = {
            'imię': recipient.firstName,
            'event_title': event.title,
            'event_date': formattedDate,
            'event_time': formattedTime,
            'host_name': event.host_name || 'Zespół Pure Life',
            'zoom_link': config.includeLink ? zoomLink : '',
            'platform_link': (event as any).category === 'team_training' ? 'https://purelife.lovable.app/events' : '',
            'is_team_training': (event as any).category === 'team_training' ? 'true' : 'false',
          };

          let finalSubject: string;
          let finalBody: string;

          if (template) {
            finalSubject = replaceTemplateVariables(template.subject, templateVariables);
            finalBody = replaceTemplateVariables(template.body_html, templateVariables);
          } else {
            const typeLabels: Record<string, string> = {
              "24h": "jutro", "12h": "za 12 godzin", "2h": "za 2 godziny",
              "1h": "za godzinę", "15min": "za 15 minut",
            };
            const timeLabel = typeLabels[resolvedType as string] || "wkrótce";
            finalSubject = `⏰ Przypomnienie: ${event.title} — ${timeLabel}!`;
            finalBody = buildFallbackBody(
              resolvedType as string, recipient.firstName, event,
              formattedDate, formattedTime, zoomLink, config.includeLink,
            );
          }

          // Send email
          await sendSmtpEmail(smtpSettings, recipient.email, finalSubject, wrapWithBranding(finalBody));

          // Parallel DB writes: log + dedup + legacy flags
          const now = new Date().toISOString();
          const legacyFlags: Record<string, Record<string, any>> = {
            "24h": { reminder_sent: true, reminder_sent_at: now },
            "12h": { reminder_12h_sent: true, reminder_12h_sent_at: now },
            "2h": { reminder_2h_sent: true, reminder_2h_sent_at: now },
            "1h": { reminder_1h_sent: true, reminder_1h_sent_at: now },
            "15min": { reminder_15min_sent: true, reminder_15min_sent_at: now },
          };

          const legacyUpdatePromise = recipient.sourceTable === 'guest'
            ? supabase.from("guest_event_registrations")
                .update(legacyFlags[resolvedType as string] || {})
                .eq("id", recipient.sourceId)
            : supabase.from("event_registrations")
                .update(legacyFlags[resolvedType as string] || {})
                .eq("id", recipient.sourceId);

          await Promise.all([
            supabase.from("email_logs").insert({
              recipient_email: recipient.email,
              recipient_user_id: recipient.userId || null,
              subject: finalSubject,
              status: "sent",
              sent_at: now,
              template_id: template?.id || null,
              event_type_id: eventType?.id || null,
              metadata: {
                type: config.eventTypeKey,
                event_id: event_id,
                registration_id: recipient.sourceId,
                registration_source: recipient.sourceTable,
                event_title: event.title,
                occurrence_index: termOccurrenceIndex,
                occurrence_datetime: termDatetime.toISOString(),
                bulk_send: true,
              },
            }),
            supabase.from("occurrence_reminders_sent").upsert({
              event_id: event_id,
              occurrence_index: termOccurrenceIndex,
              occurrence_datetime: termDatetime.toISOString(),
              recipient_email: recipient.email.toLowerCase(),
              recipient_user_id: recipient.userId || null,
              recipient_type: recipient.sourceTable,
              reminder_type: resolvedType as string,
              source_registration_id: recipient.sourceId,
            }, {
              onConflict: 'event_id,occurrence_index,recipient_email,reminder_type,occurrence_datetime'
            }),
            legacyUpdatePromise,
          ]);

          return recipient.email;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") sent++;
        else {
          failed++;
          console.error(`[bulk-reminders] Failed:`, result.reason);
        }
      }
    }

    console.log(`[bulk-reminders] Completed ${resolvedType} for "${event.title}" term=${termDatetime.toISOString()}: sent=${sent}, failed=${failed} (G:${totalGuests} U:${totalUsers})`);

    return new Response(
      JSON.stringify({
        success: true,
        reminder_type: resolvedType,
        event_title: event.title,
        occurrence_index: termOccurrenceIndex,
        occurrence_datetime: termDatetime.toISOString(),
        sent,
        failed,
        total: allRecipients.length,
        guests: totalGuests,
        users: totalUsers,
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
