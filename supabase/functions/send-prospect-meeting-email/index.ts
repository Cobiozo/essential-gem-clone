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

async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[SMTP] Sending prospect email to ${to}`);
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

    const sendCommand = async (command: string, _hideLog = false): Promise<string> => {
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    await readResponse();
    await sendCommand(`EHLO ${settings.host}`);

    if (settings.encryption === 'starttls') {
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${settings.host}`);
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    if (!authResponse.startsWith('235')) throw new Error(`Authentication failed: ${authResponse}`);

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
    if (!dataResponse.startsWith('250')) throw new Error(`Failed to send email: ${dataResponse}`);

    await sendCommand('QUIT');
    conn.close();
    return { success: true };
  } catch (error) {
    console.error('[SMTP] Error:', error);
    if (conn) { try { conn.close(); } catch {} }
    return { success: false, error: error.message };
  }
}

function buildProspectEmailHtml(
  reminderType: string,
  prospectFirstName: string,
  inviterName: string,
  meetingDate: string,
  meetingTime: string,
  zoomLink?: string
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
    case 'booking':
      content = `
        <h2 style="color: #1a365d;">📅 Zaplanowano dla Ciebie spotkanie</h2>
        <p>Cześć${prospectFirstName ? ` ${prospectFirstName}` : ''},</p>
        <p><strong>${inviterName}</strong> zaprosił(a) Cię na spotkanie, które odbędzie się:</p>
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${meetingDate}</p>
          <p style="margin: 4px 0;"><strong>🕐 Godzina:</strong> ${meetingTime}</p>
        </div>
        <p>Szczegóły dotyczące dołączenia do spotkania otrzymasz bliżej terminu.</p>`;
      break;

    case '24h':
      content = `
        <h2 style="color: #1a365d;">⏰ Przypomnienie — spotkanie jutro</h2>
        <p>Cześć${prospectFirstName ? ` ${prospectFirstName}` : ''},</p>
        <p>Przypominamy, że <strong>jutro</strong> masz zaplanowane spotkanie:</p>
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${meetingDate}</p>
          <p style="margin: 4px 0;"><strong>🕐 Godzina:</strong> ${meetingTime}</p>
        </div>
        <p>Link do spotkania otrzymasz 2 godziny przed rozpoczęciem.</p>`;
      break;

    case '12h':
      content = `
        <h2 style="color: #1a365d;">🔔 Spotkanie już dziś!</h2>
        <p>Cześć${prospectFirstName ? ` ${prospectFirstName}` : ''},</p>
        <p>Twoje spotkanie odbędzie się <strong>już dziś</strong>:</p>
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${meetingDate}</p>
          <p style="margin: 4px 0;"><strong>🕐 Godzina:</strong> ${meetingTime}</p>
        </div>
        <p><strong>2 godziny przed spotkaniem</strong> otrzymasz wiadomość z linkiem do pokoju spotkania.</p>
        <p style="background-color: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #ffc107;">
          ⚠️ Jeżeli nie otrzymasz wiadomości z linkiem na 2 godziny przed spotkaniem, 
          koniecznie zwróć się do osoby, która zaprosiła Cię na to spotkanie.
        </p>`;
      break;

    case '2h':
      content = `
        <h2 style="color: #1a365d;">🎯 Spotkanie za 2 godziny — Twój link</h2>
        <p>Cześć${prospectFirstName ? ` ${prospectFirstName}` : ''},</p>
        <p>Twoje spotkanie rozpocznie się o <strong>${meetingTime}</strong>.</p>
        <p>To spotkanie może rzucić nowe światło na temat zdrowia i Twojej przyszłości. 
        Cieszymy się, że poświęcasz czas na to ważne spotkanie!</p>
        ${zoomLink ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${zoomLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            🚀 Dołącz do spotkania
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Link: <a href="${zoomLink}">${zoomLink}</a></p>` : ''}`;
      break;

    case '15min':
      content = `
        <h2 style="color: #1a365d;">⚡ Spotkanie za 15 minut!</h2>
        <p>Cześć${prospectFirstName ? ` ${prospectFirstName}` : ''},</p>
        <p>Twoje spotkanie rozpoczyna się <strong>już za 15 minut</strong> o godzinie <strong>${meetingTime}</strong>!</p>
        <p style="font-size: 16px; font-weight: bold; color: #059669;">Bądź punktualnie! 🙌</p>
        ${zoomLink ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${zoomLink}" style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            🚀 Dołącz teraz
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Link: <a href="${zoomLink}">${zoomLink}</a></p>` : ''}`;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, prospect_email, prospect_first_name, inviter_name, meeting_date, meeting_time, reminder_type, zoom_link } = await req.json();

    if (!prospect_email || !reminder_type) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
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

    const subjectMap: Record<string, string> = {
      booking: `📅 Zaplanowano spotkanie na ${meeting_date} o ${meeting_time}`,
      '24h': `⏰ Przypomnienie: spotkanie jutro o ${meeting_time}`,
      '12h': `🔔 Spotkanie dziś o ${meeting_time}`,
      '2h': `🎯 Spotkanie za 2 godziny — dołącz o ${meeting_time}`,
      '15min': `⚡ Spotkanie za 15 minut — dołącz teraz!`,
    };

    const subject = subjectMap[reminder_type] || `Spotkanie — ${meeting_date}`;
    const htmlBody = buildProspectEmailHtml(
      reminder_type,
      prospect_first_name || '',
      inviter_name || '',
      meeting_date || '',
      meeting_time || '',
      zoom_link
    );

    const result = await sendSmtpEmail(smtpSettings, prospect_email, subject, htmlBody);

    if (result.success) {
      // Log to email_logs
      await supabase.from('email_logs').insert({
        recipient_email: prospect_email,
        subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          email_type: 'prospect_meeting',
          reminder_type,
          event_id: event_id || null,
          prospect_name: prospect_first_name,
        },
      });

      // Mark reminder as sent (for deduplication in cron)
      if (event_id && reminder_type !== 'booking') {
        await supabase.from('meeting_reminders_sent').insert({
          event_id,
          prospect_email,
          reminder_type: `prospect_${reminder_type}`,
        });
      }

      console.log(`[send-prospect-meeting-email] Sent ${reminder_type} to ${prospect_email}`);
    } else {
      console.error(`[send-prospect-meeting-email] Failed:`, result.error);
    }

    return new Response(
      JSON.stringify({ success: result.success, error: result.error }),
      { status: result.success ? 200 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[send-prospect-meeting-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
