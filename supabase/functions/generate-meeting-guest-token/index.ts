import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  console.log(`[SMTP] Sending guest invitation email to ${to}`);
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

function buildGuestInvitationHtml(
  guestFirstName: string,
  inviterName: string,
  eventTitle: string,
  meetingDate: string,
  meetingTime: string,
  meetingLink: string
): string {
  const logoUrl = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #ffffff;">
      <div style="background-color: #ffc105; padding: 20px; text-align: center;">
        <img src="${logoUrl}" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" />
      </div>
      <div style="max-width: 600px; margin: 0 auto; padding: 30px; line-height: 1.6; color: #333;">
        <h2 style="color: #1a365d;">📅 Zaproszenie na spotkanie</h2>
        <p>Cześć${guestFirstName ? ` ${guestFirstName}` : ''},</p>
        <p><strong>${inviterName}</strong> zaprasza Cię na spotkanie:</p>
        ${eventTitle ? `<p><strong>Temat:</strong> ${eventTitle}</p>` : ''}
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${meetingDate}</p>
          <p style="margin: 4px 0;"><strong>🕐 Godzina:</strong> ${meetingTime}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${meetingLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            🚀 Dołącz do spotkania
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Link do spotkania: <a href="${meetingLink}">${meetingLink}</a></p>
        <p style="background-color: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #ffc107; margin-top: 16px;">
          💡 Zachowaj tę wiadomość — link do spotkania będzie aktywny w dniu wydarzenia. 
          Przed spotkaniem otrzymasz jeszcze przypomnienia e-mail.
        </p>
      </div>
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px;">
        <p>Zespół Pure Life Center</p>
        <p>© ${new Date().getFullYear()} Pure Life Center. Wszelkie prawa zastrzeżone.</p>
        <p>Kontakt: support@purelife.info.pl</p>
      </div>
    </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { room_id, first_name, last_name, email, inviter_user_id } = await req.json();

    // Validate input
    if (!room_id || !first_name?.trim() || !last_name?.trim() || !email?.trim() || !inviter_user_id) {
      return new Response(JSON.stringify({ error: 'Brakujące dane: imię, nazwisko, email i ID zapraszającego są wymagane' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy adres email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify event exists and allows guest access
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, allow_guest_access, use_internal_meeting, start_time, meeting_room_id')
      .eq('meeting_room_id', room_id)
      .eq('use_internal_meeting', true)
      .maybeSingle();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Spotkanie nie istnieje lub nie jest aktywne' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!event.allow_guest_access) {
      return new Response(JSON.stringify({ error: 'To spotkanie nie przyjmuje gości zewnętrznych' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token already exists for this email + room
    const { data: existingToken } = await supabase
      .from('meeting_guest_tokens')
      .select('id, token, expires_at')
      .eq('room_id', room_id)
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existingToken && new Date(existingToken.expires_at) > new Date()) {
      // Return existing valid token
      return new Response(JSON.stringify({
        token: existingToken.token,
        guest_token_id: existingToken.id,
        event_title: event.title,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4h

    // Create guest token record
    const { data: guestToken, error: tokenError } = await supabase
      .from('meeting_guest_tokens')
      .upsert({
        room_id,
        event_id: event.id,
        inviter_user_id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        token,
        expires_at: expiresAt,
      }, { onConflict: 'room_id,email' })
      .select('id')
      .single();

    if (tokenError || !guestToken) {
      console.error('[generate-meeting-guest-token] Token creation error:', tokenError);
      return new Response(JSON.stringify({ error: 'Nie udało się wygenerować tokenu' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create analytics record
    await supabase.from('meeting_guest_analytics').insert({
      guest_token_id: guestToken.id,
      event_id: event.id,
      room_id,
      inviter_user_id,
    });

    // Add guest to inviter's private contacts (team_contacts)
    const { data: existingContact } = await supabase
      .from('team_contacts')
      .select('id')
      .eq('user_id', inviter_user_id)
      .eq('email', email.trim().toLowerCase())
      .eq('contact_type', 'private')
      .maybeSingle();

    if (existingContact) {
      // Update notes
      await supabase.from('team_contacts').update({
        notes: `Gość spotkania: ${event.title} - ${new Date().toLocaleDateString('pl-PL')}`,
        is_active: true,
      }).eq('id', existingContact.id);
    } else {
      await supabase.from('team_contacts').insert({
        user_id: inviter_user_id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        contact_type: 'private',
        role: 'client',
        relationship_status: 'potential_partner',
        notes: `Gość spotkania: ${event.title} - ${new Date().toLocaleDateString('pl-PL')}`,
        added_at: new Date().toISOString().split('T')[0],
        is_active: true,
      });
    }

    console.log(`[generate-meeting-guest-token] Token generated for ${email} in room ${room_id}`);

    // === SEND CONFIRMATION EMAIL TO GUEST ===
    try {
      // Get inviter profile
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', inviter_user_id)
        .single();

      const inviterName = inviterProfile
        ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim()
        : 'Organizator';

      // Get SMTP settings
      const { data: smtpData } = await supabase
        .from('smtp_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (smtpData) {
        const smtpSettings: SmtpSettings = {
          host: smtpData.smtp_host,
          port: Number(smtpData.smtp_port),
          encryption: smtpData.smtp_encryption,
          username: smtpData.smtp_username,
          password: smtpData.smtp_password,
          from_email: smtpData.sender_email,
          from_name: smtpData.sender_name,
        };

        // Format date/time from event.start_time
        const meetingStart = new Date(event.start_time);
        const dateStr = meetingStart.toLocaleDateString('pl-PL', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw'
        });
        const timeStr = meetingStart.toLocaleTimeString('pl-PL', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
        });

        const meetingLink = `https://purelife.lovable.app/meeting/${room_id}`;
        const subject = `📅 Zaproszenie na spotkanie — ${dateStr} o ${timeStr}`;
        const htmlBody = buildGuestInvitationHtml(
          first_name.trim(),
          inviterName,
          event.title || '',
          dateStr,
          timeStr,
          meetingLink
        );

        const emailResult = await sendSmtpEmail(smtpSettings, email.trim().toLowerCase(), subject, htmlBody);

        if (emailResult.success) {
          console.log(`[generate-meeting-guest-token] Confirmation email sent to ${email}`);
          // Log to email_logs
          await supabase.from('email_logs').insert({
            recipient_email: email.trim().toLowerCase(),
            subject,
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              email_type: 'guest_meeting_invitation',
              event_id: event.id,
              room_id,
              guest_name: `${first_name.trim()} ${last_name.trim()}`,
            },
          });
        } else {
          console.error(`[generate-meeting-guest-token] Email send failed:`, emailResult.error);
        }
      } else {
        console.warn('[generate-meeting-guest-token] No active SMTP config — skipping confirmation email');
      }
    } catch (emailErr) {
      // Non-blocking — don't fail the token generation
      console.error('[generate-meeting-guest-token] Email error (non-blocking):', emailErr);
    }

    return new Response(JSON.stringify({
      token,
      guest_token_id: guestToken.id,
      event_title: event.title,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-meeting-guest-token] Error:', error);
    return new Response(JSON.stringify({ error: 'Błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
