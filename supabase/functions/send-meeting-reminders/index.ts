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
    
    // Define time windows for reminders
    // 24h reminder: between 23h and 25h before event
    const reminder24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminder24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    // 1h reminder: between 45min and 75min before event
    const reminder1hStart = new Date(now.getTime() + 45 * 60 * 1000);
    const reminder1hEnd = new Date(now.getTime() + 75 * 60 * 1000);

    console.log('[send-meeting-reminders] Checking for meetings needing reminders...');
    console.log(`[send-meeting-reminders] 24h window: ${reminder24hStart.toISOString()} - ${reminder24hEnd.toISOString()}`);
    console.log(`[send-meeting-reminders] 1h window: ${reminder1hStart.toISOString()} - ${reminder1hEnd.toISOString()}`);

    // Get individual meetings in the reminder windows
    const { data: meetings, error: meetingsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        start_time,
        host_user_id,
        event_type
      `)
      .in('event_type', ['tripartite_meeting', 'partner_consultation'])
      .eq('is_active', true)
      .or(`and(start_time.gte.${reminder24hStart.toISOString()},start_time.lte.${reminder24hEnd.toISOString()}),and(start_time.gte.${reminder1hStart.toISOString()},start_time.lte.${reminder1hEnd.toISOString()})`);

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

    // Get email templates
    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .in('internal_name', ['meeting_reminder_24h', 'meeting_reminder_1h']);

    const template24h = templates?.find(t => t.internal_name === 'meeting_reminder_24h');
    const template1h = templates?.find(t => t.internal_name === 'meeting_reminder_1h');

    if (!template24h || !template1h) {
      console.error('[send-meeting-reminders] Missing email templates');
      return new Response(
        JSON.stringify({ success: false, error: "Missing email templates" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const meeting of meetings) {
      const meetingStart = new Date(meeting.start_time);
      const hoursUntil = (meetingStart.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Determine reminder type
      let reminderType: '24h' | '1h';
      let template: typeof template24h;
      
      if (hoursUntil >= 23 && hoursUntil <= 25) {
        reminderType = '24h';
        template = template24h;
      } else if (hoursUntil >= 0.75 && hoursUntil <= 1.25) {
        reminderType = '1h';
        template = template1h;
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
        month: 'long' 
      });
      const timeStr = meetingStart.toLocaleTimeString('pl-PL', { 
        hour: '2-digit', 
        minute: '2-digit' 
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

        const variables = {
          imię: profile.first_name || '',
          temat: meeting.title,
          data_spotkania: dateStr,
          godzina_spotkania: timeStr,
          druga_strona: otherPartyName,
        };

        const subject = replaceVariables(template.subject, variables);
        const htmlBody = replaceVariables(template.body_html, variables);

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
            },
          });

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
