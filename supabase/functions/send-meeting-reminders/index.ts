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

// Base64 encode for SMTP
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

// Send email via raw SMTP connection
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[SMTP] Sending reminder to ${to}`);

  let conn: Deno.Conn | null = null;
  
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (settings.encryption === 'ssl') {
      conn = await withTimeout(
        Deno.connectTls({
          hostname: settings.host,
          port: settings.port,
        }),
        30000
      );
    } else {
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
      return decoder.decode(buffer.subarray(0, n));
    };

    const sendCommand = async (command: string, hideLog = false): Promise<string> => {
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    await readResponse();
    await sendCommand(`EHLO ${settings.host}`);

    if (settings.encryption === 'starttls') {
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, {
        hostname: settings.host,
      });
      await sendCommand(`EHLO ${settings.host}`);
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    
    if (!authResponse.startsWith('235')) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    await sendCommand(`MAIL FROM:<${settings.from_email}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand('DATA');

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

    await sendCommand('QUIT');
    conn.close();

    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    if (conn) {
      try { conn.close(); } catch {}
    }
    return { success: false, error: error.message };
  }
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

function buildGuestReminderHtml(
  reminderType: string,
  guestFirstName: string,
  inviterName: string,
  eventTitle: string,
  meetingDate: string,
  meetingTime: string,
  meetingLink?: string
): string {
  const logoUrl = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png';

  const header = `
    <div style="background-color: #ffc105; padding: 20px; text-align: center;">
      <img src="${logoUrl}" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" />
    </div>`;

  const footer = `
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px;">
      <p>Zespół Pure Life Center</p>
      <p>© ${new Date().getFullYear()} Pure Life Center. Wszelkie prawa zastrzeżone.</p>
      <p>Kontakt: support@purelife.info.pl</p>
    </div>`;

  let content = '';

  switch (reminderType) {
    case '24h':
      content = `
        <h2 style="color: #1a365d;">⏰ Przypomnienie — spotkanie jutro</h2>
        <p>Cześć${guestFirstName ? ` ${guestFirstName}` : ''},</p>
        <p>Przypominamy, że <strong>jutro</strong> masz zaplanowane spotkanie z <strong>${inviterName}</strong>:</p>
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
          ${eventTitle ? `<p style="margin: 4px 0;"><strong>📋 Temat:</strong> ${eventTitle}</p>` : ''}
          <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${meetingDate}</p>
          <p style="margin: 4px 0;"><strong>🕐 Godzina:</strong> ${meetingTime}</p>
        </div>
        <p>Link do spotkania otrzymasz 2 godziny przed rozpoczęciem.</p>`;
      break;

    case '12h':
      content = `
        <h2 style="color: #1a365d;">🔔 Spotkanie już dziś!</h2>
        <p>Cześć${guestFirstName ? ` ${guestFirstName}` : ''},</p>
        <p>Twoje spotkanie z <strong>${inviterName}</strong> odbędzie się <strong>już dziś</strong>:</p>
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
          ${eventTitle ? `<p style="margin: 4px 0;"><strong>📋 Temat:</strong> ${eventTitle}</p>` : ''}
          <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${meetingDate}</p>
          <p style="margin: 4px 0;"><strong>🕐 Godzina:</strong> ${meetingTime}</p>
        </div>
        <p><strong>2 godziny przed spotkaniem</strong> otrzymasz wiadomość z linkiem do pokoju.</p>`;
      break;

    case '2h':
      content = `
        <h2 style="color: #1a365d;">🎯 Spotkanie za 2 godziny — Twój link</h2>
        <p>Cześć${guestFirstName ? ` ${guestFirstName}` : ''},</p>
        <p>Twoje spotkanie z <strong>${inviterName}</strong> rozpocznie się o <strong>${meetingTime}</strong>.</p>
        ${meetingLink ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${meetingLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            🚀 Dołącz do spotkania
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Link: <a href="${meetingLink}">${meetingLink}</a></p>` : ''}`;
      break;

    case '1h':
      content = `
        <h2 style="color: #1a365d;">⚡ Spotkanie za godzinę!</h2>
        <p>Cześć${guestFirstName ? ` ${guestFirstName}` : ''},</p>
        <p>Twoje spotkanie z <strong>${inviterName}</strong> rozpocznie się o <strong>${meetingTime}</strong> — już za godzinę!</p>
        ${meetingLink ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${meetingLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            🚀 Dołącz do spotkania
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Link: <a href="${meetingLink}">${meetingLink}</a></p>` : ''}`;
      break;

    case '15min':
      content = `
        <h2 style="color: #1a365d;">⚡ Spotkanie za 15 minut!</h2>
        <p>Cześć${guestFirstName ? ` ${guestFirstName}` : ''},</p>
        <p>Twoje spotkanie rozpoczyna się <strong>za 15 minut</strong> o godzinie <strong>${meetingTime}</strong>!</p>
        <p style="font-size: 16px; font-weight: bold; color: #059669;">Bądź punktualnie! 🙌</p>
        ${meetingLink ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${meetingLink}" style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            🚀 Dołącz teraz
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Link: <a href="${meetingLink}">${meetingLink}</a></p>` : ''}`;
      break;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #ffffff;">
      ${header}
      <div style="max-width: 600px; margin: 0 auto; padding: 30px; line-height: 1.6; color: #333;">
        ${content}
      </div>
      ${footer}
    </body></html>`;
}

serve(async (req) => {
  console.log('[send-meeting-reminders] Request received');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    
    // Define time windows for all 5 reminder types
    const reminder24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminder24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    const reminder12hStart = new Date(now.getTime() + 11 * 60 * 60 * 1000);
    const reminder12hEnd = new Date(now.getTime() + 13 * 60 * 60 * 1000);
    
    const reminder2hStart = new Date(now.getTime() + 110 * 60 * 1000);
    const reminder2hEnd = new Date(now.getTime() + 130 * 60 * 1000);
    
    const reminder1hStart = new Date(now.getTime() + 50 * 60 * 1000);
    const reminder1hEnd = new Date(now.getTime() + 70 * 60 * 1000);
    
    const reminder15minStart = new Date(now.getTime() + 10 * 60 * 1000);
    const reminder15minEnd = new Date(now.getTime() + 20 * 60 * 1000);

    console.log('[send-meeting-reminders] Checking for meetings needing reminders...');

    // Get meetings in any of the 5 reminder windows
    const { data: meetings, error: meetingsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        start_time,
        host_user_id,
        event_type,
        zoom_link,
        created_by
      `)
      .in('event_type', ['meeting_private', 'tripartite_meeting', 'partner_consultation'])
      .eq('is_active', true)
      .or(`and(start_time.gte.${reminder24hStart.toISOString()},start_time.lte.${reminder24hEnd.toISOString()}),and(start_time.gte.${reminder12hStart.toISOString()},start_time.lte.${reminder12hEnd.toISOString()}),and(start_time.gte.${reminder2hStart.toISOString()},start_time.lte.${reminder2hEnd.toISOString()}),and(start_time.gte.${reminder1hStart.toISOString()},start_time.lte.${reminder1hEnd.toISOString()}),and(start_time.gte.${reminder15minStart.toISOString()},start_time.lte.${reminder15minEnd.toISOString()})`);

    if (meetingsError) {
      console.error('[send-meeting-reminders] Error fetching meetings:', meetingsError);
      throw meetingsError;
    }

    console.log(`[send-meeting-reminders] Found ${meetings?.length || 0} meetings in reminder windows`);

    if (!meetings || meetings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No meetings need reminders', sent: 0 }),
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
      console.error('[send-meeting-reminders] No active SMTP configuration');
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

    // Get all 5 email templates
    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .in('internal_name', [
        'meeting_reminder_24h', 'meeting_reminder_12h', 'meeting_reminder_2h',
        'meeting_reminder_1h', 'meeting_reminder_15min'
      ]);

    const templateMap: Record<string, typeof templates extends (infer T)[] | null ? T : never> = {};
    templates?.forEach(t => { templateMap[t.internal_name] = t; });

    // Verify required templates exist
    const requiredTemplates = ['meeting_reminder_1h', 'meeting_reminder_15min'];
    for (const name of requiredTemplates) {
      if (!templateMap[name]) {
        console.error(`[send-meeting-reminders] Missing required template: ${name}`);
        return new Response(
          JSON.stringify({ success: false, error: `Missing email template: ${name}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const meeting of meetings) {
      const meetingStart = new Date(meeting.start_time);
      const minutesUntil = (meetingStart.getTime() - now.getTime()) / (1000 * 60);
      const hoursUntil = minutesUntil / 60;
      
      // Determine reminder type — same 5 windows for everyone
      let reminderType: '24h' | '12h' | '2h' | '1h' | '15min';
      let templateName: string;
      
      if (hoursUntil >= 23 && hoursUntil <= 25) {
        reminderType = '24h';
        templateName = 'meeting_reminder_24h';
      } else if (hoursUntil >= 11 && hoursUntil <= 13) {
        reminderType = '12h';
        templateName = 'meeting_reminder_12h';
      } else if (minutesUntil >= 110 && minutesUntil <= 130) {
        reminderType = '2h';
        templateName = 'meeting_reminder_2h';
      } else if (minutesUntil >= 50 && minutesUntil <= 70) {
        reminderType = '1h';
        templateName = 'meeting_reminder_1h';
      } else if (minutesUntil >= 10 && minutesUntil <= 20) {
        reminderType = '15min';
        templateName = 'meeting_reminder_15min';
      } else {
        continue;
      }

      const template = templateMap[templateName];
      if (!template) {
        console.log(`[send-meeting-reminders] Skipping ${reminderType} reminder — no template ${templateName}`);
        continue;
      }

      console.log(`[send-meeting-reminders] Processing meeting ${meeting.id} for ${reminderType} reminder`);

      // Format date/time
      const dateStr = meetingStart.toLocaleDateString('pl-PL', { 
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Warsaw'
      });
      const timeStr = meetingStart.toLocaleTimeString('pl-PL', { 
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
      });

      // === Send prospect email for tripartite meetings ===
      if (meeting.event_type === 'tripartite_meeting') {
        try {
          const desc = meeting.description ? JSON.parse(meeting.description) : {};
          const prospectEmail = desc.prospect_email;
          
          if (prospectEmail) {
            // Check if already sent
            const { data: existingProspectReminder } = await supabase
              .from('meeting_reminders_sent')
              .select('id')
              .eq('event_id', meeting.id)
              .eq('prospect_email', prospectEmail)
              .eq('reminder_type', `prospect_${reminderType}`)
              .maybeSingle();

            if (!existingProspectReminder) {
              // Get booker name for inviter_name
              const { data: bookerProfile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('user_id', meeting.created_by)
                .maybeSingle();
              
              const inviterName = bookerProfile 
                ? `${bookerProfile.first_name || ''} ${bookerProfile.last_name || ''}`.trim()
                : '';

              await supabase.functions.invoke('send-prospect-meeting-email', {
                body: {
                  event_id: meeting.id,
                  prospect_email: prospectEmail,
                  prospect_first_name: desc.prospect_first_name || '',
                  inviter_name: inviterName,
                  meeting_date: dateStr,
                  meeting_time: timeStr,
                  reminder_type: reminderType,
                  zoom_link: (reminderType === '2h' || reminderType === '15min') ? meeting.zoom_link : undefined,
                },
              });
              console.log(`[send-meeting-reminders] Prospect ${reminderType} reminder sent to ${prospectEmail}`);
              sentCount++;
            } else {
              console.log(`[send-meeting-reminders] Prospect ${reminderType} already sent to ${prospectEmail}`);
            }
          }
        } catch (prospectErr) {
          console.warn(`[send-meeting-reminders] Prospect reminder failed:`, prospectErr);
        }
      }

      // === Send reminders to guest token holders (meeting_guest_tokens) ===
      if (meeting.event_type === 'meeting_private' || meeting.event_type === 'tripartite_meeting' || meeting.event_type === 'partner_consultation') {
        try {
          const { data: guestTokens } = await supabase
            .from('meeting_guest_tokens')
            .select('id, email, first_name, last_name, room_id, inviter_user_id')
            .eq('event_id', meeting.id);

          if (guestTokens && guestTokens.length > 0) {
            for (const guest of guestTokens) {
              const guestReminderType = `guest_${reminderType}`;

              // Deduplication check
              const { data: existingGuestReminder } = await supabase
                .from('meeting_reminders_sent')
                .select('id')
                .eq('event_id', meeting.id)
                .eq('prospect_email', guest.email)
                .eq('reminder_type', guestReminderType)
                .maybeSingle();

              if (existingGuestReminder) {
                console.log(`[send-meeting-reminders] Guest ${guestReminderType} already sent to ${guest.email}`);
                continue;
              }

              // Get inviter name
              const { data: inviterProfile } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('user_id', guest.inviter_user_id)
                .maybeSingle();

              const inviterName = inviterProfile
                ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim()
                : 'Organizator';

              const includeLink = reminderType === '2h' || reminderType === '1h' || reminderType === '15min';
              const meetingLink = `https://purelife.lovable.app/meeting/${guest.room_id}`;

              const guestSubject = reminderType === '24h' ? `⏰ Przypomnienie: spotkanie jutro o ${timeStr}`
                : reminderType === '12h' ? `🔔 Spotkanie dziś o ${timeStr}`
                : reminderType === '2h' ? `🎯 Spotkanie za 2 godziny — dołącz o ${timeStr}`
                : reminderType === '1h' ? `⚡ Spotkanie za godzinę — o ${timeStr}`
                : `⚡ Spotkanie za 15 minut — dołącz teraz!`;

              const guestHtmlBody = buildGuestReminderHtml(
                reminderType,
                guest.first_name || '',
                inviterName,
                meeting.title || 'Spotkanie',
                dateStr,
                timeStr,
                includeLink ? meetingLink : undefined
              );

              const guestResult = await sendSmtpEmail(smtpSettings, guest.email, guestSubject, guestHtmlBody);

              if (guestResult.success) {
                await supabase.from('meeting_reminders_sent').insert({
                  event_id: meeting.id,
                  prospect_email: guest.email,
                  reminder_type: guestReminderType,
                });

                await supabase.from('email_logs').insert({
                  recipient_email: guest.email,
                  subject: guestSubject,
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                  metadata: {
                    email_type: 'guest_meeting_reminder',
                    reminder_type: reminderType,
                    event_id: meeting.id,
                    guest_name: `${guest.first_name} ${guest.last_name}`,
                  },
                });

                sentCount++;
                console.log(`[send-meeting-reminders] Guest ${reminderType} reminder sent to ${guest.email}`);
              } else {
                errors.push(`Guest email failed for ${guest.email}: ${guestResult.error}`);
              }
            }
          }
        } catch (guestErr) {
          console.warn(`[send-meeting-reminders] Guest reminders failed:`, guestErr);
        }
      }

      // === Send reminders to registered users (all 5 windows) ===
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', meeting.id)
        .eq('status', 'registered');

      if (!registrations || registrations.length === 0) {
        console.log(`[send-meeting-reminders] No registered participants for meeting ${meeting.id}`);
        continue;
      }

      // Get all user IDs (registrations + host)
      const userIds = [...new Set([
        ...registrations.map(r => r.user_id),
        meeting.host_user_id
      ].filter(Boolean))];

      // Get profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', userIds);

      if (!profiles) continue;

      // Send reminder to each participant
      for (const profile of profiles) {
        // Check if reminder already sent
        const { data: existingReminder } = await supabase
          .from('meeting_reminders_sent')
          .select('id')
          .eq('event_id', meeting.id)
          .eq('user_id', profile.user_id)
          .eq('reminder_type', reminderType)
          .maybeSingle();

        if (existingReminder) {
          console.log(`[send-meeting-reminders] Reminder ${reminderType} already sent to ${profile.email} for meeting ${meeting.id}`);
          continue;
        }

        // Find the other party's name
        const otherParty = profiles.find(p => p.user_id !== profile.user_id);
        const otherPartyName = otherParty 
          ? `${otherParty.first_name || ''} ${otherParty.last_name || ''}`.trim() 
          : 'Partner';

        // Check if this is tripartite meeting and if user is the booker (not host)
        const isTripartite = meeting.event_type === 'tripartite_meeting';
        const isBooker = profile.user_id === meeting.created_by && profile.user_id !== meeting.host_user_id;

        // Build variables
        const hostProfile = profiles.find(p => p.user_id === meeting.host_user_id);
        const bookerProfile = profiles.find(p => p.user_id === meeting.created_by);

        const variables: Record<string, string> = {
          imię: profile.first_name || '',
          temat: meeting.title,
          data_spotkania: dateStr,
          godzina_spotkania: timeStr,
          druga_strona: otherPartyName,
          zoom_link: meeting.zoom_link || '',
          imie_lidera: hostProfile?.first_name || '',
          nazwisko_lidera: hostProfile?.last_name || '',
          imie_rezerwujacego: bookerProfile?.first_name || '',
          nazwisko_rezerwujacego: bookerProfile?.last_name || '',
        };

        // Add special note for booker in tripartite meetings (1h reminder only)
        if (isTripartite && isBooker && reminderType === '1h') {
          variables['adnotacja_trojstronna'] = 
            '<p style="background-color: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 16px 0;">' +
            '<strong>⚠️ Przypomnienie:</strong> Jeśli zapraszasz osobę zewnętrzną na to spotkanie, ' +
            'skontaktuj się z nią teraz, aby upewnić się, że nic w planach się nie zmieniło. ' +
            'Prześlij jej link do spotkania - pokój będzie otwarty 5 minut przed czasem.</p>';
        } else {
          variables['adnotacja_trojstronna'] = '';
        }

        const subject = replaceVariables(template.subject, variables);
        let htmlBody = replaceVariables(template.body_html, variables);
        
        // Append tripartite note if exists
        if (variables['adnotacja_trojstronna']) {
          htmlBody = htmlBody.replace('</body>', variables['adnotacja_trojstronna'] + '</body>');
          if (!htmlBody.includes('</body>')) {
            htmlBody += variables['adnotacja_trojstronna'];
          }
        }

        const result = await sendSmtpEmail(smtpSettings, profile.email, subject, htmlBody);

        if (result.success) {
          // Mark reminder as sent
          const { error: insertError } = await supabase
            .from('meeting_reminders_sent')
            .insert({
              event_id: meeting.id,
              user_id: profile.user_id,
              reminder_type: reminderType,
            });

          if (insertError) {
            console.error(`[send-meeting-reminders] Failed to mark reminder as sent:`, insertError);
          }

          // Log to email_logs
          await supabase.from('email_logs').insert({
            template_id: template.id,
            recipient_email: profile.email,
            recipient_user_id: profile.user_id,
            subject: subject,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: { 
              reminder_type: reminderType,
              event_id: meeting.id,
              is_tripartite_booker: isTripartite && isBooker,
            },
          });

          // Send Push notification (best effort)
          try {
            const pushTitle = reminderType === '24h' ? "Spotkanie jutro"
              : reminderType === '12h' ? "Spotkanie dziś"
              : reminderType === '2h' ? "Spotkanie za 2 godziny"
              : reminderType === '1h' ? "Spotkanie za godzinę"
              : "Spotkanie za 15 minut";

            await supabase.functions.invoke("send-push-notification", {
              body: {
                userId: profile.user_id,
                title: pushTitle,
                body: `${meeting.title || 'Spotkanie indywidualne'} — ${timeStr} (Warsaw)`,
                url: `/events/individual-meetings?event=${meeting.id}`,
                tag: `meeting-${reminderType}-${meeting.id}`
              }
            });
          } catch (pushErr) {
            console.warn(`[send-meeting-reminders] Push failed (non-blocking):`, pushErr);
          }

          // In-app notification
          const reminderLabel = reminderType === '24h' ? 'jutro'
            : reminderType === '12h' ? 'dziś'
            : reminderType === '2h' ? 'za 2 godziny'
            : reminderType === '1h' ? 'za godzinę'
            : 'za 15 minut';
          try {
            await supabase.from('user_notifications').insert({
              user_id: profile.user_id,
              notification_type: 'meeting_reminder',
              source_module: 'meetings',
              title: `Przypomnienie: ${meeting.title || 'Spotkanie'}`,
              message: `Spotkanie z ${otherPartyName} — ${dateStr} o ${timeStr} (Warsaw) (${reminderLabel})`,
              link: `/events/individual-meetings?event=${meeting.id}`,
              metadata: { event_id: meeting.id, reminder_type: reminderType },
            });
          } catch (inAppErr) {
            console.warn(`[send-meeting-reminders] In-app notification failed:`, inAppErr);
          }

          sentCount++;
          console.log(`[send-meeting-reminders] Sent ${reminderType} reminder to ${profile.email}`);
        } else {
          errors.push(`Failed to send to ${profile.email}: ${result.error}`);
          console.error(`[send-meeting-reminders] Failed to send to ${profile.email}:`, result.error);
        }
      }
    }

    console.log(`[send-meeting-reminders] Completed. Sent ${sentCount} reminders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-meeting-reminders] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
