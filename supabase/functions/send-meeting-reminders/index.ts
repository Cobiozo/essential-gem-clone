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
    
    // Define time windows for reminders (24h + 1h + 15min)
    // 24h reminder: between 23h and 25h before event
    const reminder24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminder24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    // 1h reminder: between 50min and 70min before event
    const reminder1hStart = new Date(now.getTime() + 50 * 60 * 1000);
    const reminder1hEnd = new Date(now.getTime() + 70 * 60 * 1000);
    
    // 15min reminder: between 10min and 20min before event
    const reminder15minStart = new Date(now.getTime() + 10 * 60 * 1000);
    const reminder15minEnd = new Date(now.getTime() + 20 * 60 * 1000);

    console.log('[send-meeting-reminders] Checking for meetings needing reminders...');
    console.log(`[send-meeting-reminders] 24h window: ${reminder24hStart.toISOString()} - ${reminder24hEnd.toISOString()}`);
    console.log(`[send-meeting-reminders] 1h window: ${reminder1hStart.toISOString()} - ${reminder1hEnd.toISOString()}`);
    console.log(`[send-meeting-reminders] 15min window: ${reminder15minStart.toISOString()} - ${reminder15minEnd.toISOString()}`);

    // Get meetings in the reminder windows (including meeting_private)
    const { data: meetings, error: meetingsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        start_time,
        host_user_id,
        event_type,
        zoom_link,
        created_by
      `)
      .in('event_type', ['meeting_private', 'tripartite_meeting', 'partner_consultation'])
      .eq('is_active', true)
      .or(`and(start_time.gte.${reminder24hStart.toISOString()},start_time.lte.${reminder24hEnd.toISOString()}),and(start_time.gte.${reminder1hStart.toISOString()},start_time.lte.${reminder1hEnd.toISOString()}),and(start_time.gte.${reminder15minStart.toISOString()},start_time.lte.${reminder15minEnd.toISOString()})`);

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

    // Get email templates (24h + 1h + 15min)
    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .in('internal_name', ['meeting_reminder_24h', 'meeting_reminder_1h', 'meeting_reminder_15min']);

    const template24h = templates?.find(t => t.internal_name === 'meeting_reminder_24h');
    const template1h = templates?.find(t => t.internal_name === 'meeting_reminder_1h');
    const template15min = templates?.find(t => t.internal_name === 'meeting_reminder_15min');

    if (!template1h || !template15min) {
      console.error('[send-meeting-reminders] Missing email templates (1h or 15min)');
      return new Response(
        JSON.stringify({ success: false, error: "Missing email templates (meeting_reminder_1h or meeting_reminder_15min)" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    if (!template24h) {
      console.warn('[send-meeting-reminders] Missing meeting_reminder_24h template, 24h reminders will be skipped');
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const meeting of meetings) {
      const meetingStart = new Date(meeting.start_time);
      const minutesUntil = (meetingStart.getTime() - now.getTime()) / (1000 * 60);
      
      // Determine reminder type
      let reminderType: '24h' | '1h' | '15min';
      let template: typeof template1h;
      
      const hoursUntil = minutesUntil / 60;
      if (hoursUntil >= 23 && hoursUntil <= 25) {
        reminderType = '24h';
        if (!template24h) {
          console.log(`[send-meeting-reminders] Skipping 24h reminder - no template`);
          continue;
        }
        template = template24h;
      } else if (minutesUntil >= 50 && minutesUntil <= 70) {
        reminderType = '1h';
        template = template1h;
      } else if (minutesUntil >= 10 && minutesUntil <= 20) {
        reminderType = '15min';
        template = template15min;
      } else {
        continue;
      }

      console.log(`[send-meeting-reminders] Processing meeting ${meeting.id} for ${reminderType} reminder`);

      // Get participants for this meeting
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

      // Format date/time
      const dateStr = meetingStart.toLocaleDateString('pl-PL', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        timeZone: 'Europe/Warsaw'
      });
      const timeStr = meetingStart.toLocaleTimeString('pl-PL', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Warsaw'
      });

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
        // Find host and booker profiles for email variables
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
          console.log(`[send-meeting-reminders] Adding tripartite note for booker ${profile.email}`);
        } else {
          variables['adnotacja_trojstronna'] = '';
        }

        const subject = replaceVariables(template.subject, variables);
        let htmlBody = replaceVariables(template.body_html, variables);
        
        // Append tripartite note if exists
        if (variables['adnotacja_trojstronna']) {
          htmlBody = htmlBody.replace('</body>', variables['adnotacja_trojstronna'] + '</body>');
          // Also try to add before footer if no </body>
          if (!htmlBody.includes('</body>')) {
            htmlBody += variables['adnotacja_trojstronna'];
          }
        }

        const result = await sendSmtpEmail(smtpSettings, profile.email, subject, htmlBody);

        if (result.success) {
          // Mark reminder as sent
          await supabase
            .from('meeting_reminders_sent')
            .insert({
              event_id: meeting.id,
              user_id: profile.user_id,
              reminder_type: reminderType,
            });

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
            await supabase.functions.invoke("send-push-notification", {
              body: {
                userId: profile.user_id,
                title: reminderType === '24h' 
                  ? "Spotkanie jutro"
                  : reminderType === '1h' 
                    ? "Spotkanie za godzinę" 
                    : "Spotkanie za 15 minut",
                body: `${meeting.title || 'Spotkanie indywidualne'} — ${timeStr}`,
                url: "/meetings",
                tag: `meeting-${reminderType}-${meeting.id}`
              }
            });
            console.log(`[send-meeting-reminders] Push sent for ${reminderType} reminder to ${profile.email}`);
          } catch (pushErr) {
            console.warn(`[send-meeting-reminders] Push failed (non-blocking):`, pushErr);
          }

          // In-app notification
          const reminderLabel = reminderType === '24h' ? 'jutro' : reminderType === '1h' ? 'za godzinę' : 'za 15 minut';
          try {
            await supabase.from('user_notifications').insert({
              user_id: profile.user_id,
              notification_type: 'meeting_reminder',
              source_module: 'meetings',
              title: `Przypomnienie: ${meeting.title || 'Spotkanie'}`,
              message: `Spotkanie z ${otherPartyName} — ${dateStr} o ${timeStr} (${reminderLabel})`,
              link: '/events/individual-meetings',
              metadata: { event_id: meeting.id, reminder_type: reminderType },
            });
            console.log(`[send-meeting-reminders] In-app notification sent to ${profile.email}`);
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
