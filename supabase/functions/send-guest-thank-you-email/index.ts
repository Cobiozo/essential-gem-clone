import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return btoa(String.fromCharCode(...data));
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

async function sendSmtpEmail(settings: SmtpSettings, to: string, subject: string, htmlBody: string): Promise<void> {
  let conn: Deno.TcpConn | Deno.TlsConn;

  if (settings.encryption_type === "ssl") {
    conn = await withTimeout(Deno.connectTls({ hostname: settings.host, port: settings.port }), 15000, "SSL timeout");
  } else {
    conn = await withTimeout(Deno.connect({ hostname: settings.host, port: settings.port }), 15000, "TCP timeout");
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

  await readResponse();
  await sendCommand(`EHLO ${settings.host}`);

  if (settings.encryption_type === "starttls") {
    await sendCommand("STARTTLS");
    conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
    await sendCommand(`EHLO ${settings.host}`);
  }

  await sendCommand(`AUTH LOGIN`);
  await sendCommand(base64Encode(settings.username));
  await sendCommand(base64Encode(settings.password));
  await sendCommand(`MAIL FROM:<${settings.sender_email}>`);
  await sendCommand(`RCPT TO:<${to}>`);
  await sendCommand("DATA");

  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
  const message = [
    `From: "${settings.sender_name}" <${settings.sender_email}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlBody))),
    ``,
    `--${boundary}--`,
    `.`,
  ].join("\r\n");

  await sendCommand(message);
  await sendCommand("QUIT");

  try { conn.close(); } catch {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guest_token_id } = await req.json();

    if (!guest_token_id) {
      return new Response(JSON.stringify({ error: 'guest_token_id wymagane' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get guest token data
    const { data: guestToken, error: tokenError } = await supabase
      .from('meeting_guest_tokens')
      .select('id, first_name, last_name, email, inviter_user_id, event_id')
      .eq('id', guest_token_id)
      .single();

    if (tokenError || !guestToken) {
      return new Response(JSON.stringify({ error: 'Token nie znaleziony' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if email already sent
    const { data: analytics } = await supabase
      .from('meeting_guest_analytics')
      .select('id, thank_you_email_sent, duration_seconds')
      .eq('guest_token_id', guest_token_id)
      .maybeSingle();

    if (analytics?.thank_you_email_sent) {
      return new Response(JSON.stringify({ success: true, message: 'Email already sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only send if guest actually participated (duration > 0)
    if (!analytics || !analytics.duration_seconds || analytics.duration_seconds < 30) {
      return new Response(JSON.stringify({ success: false, message: 'Guest did not participate long enough' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get inviter info
    const { data: inviter } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone_number')
      .eq('user_id', guestToken.inviter_user_id)
      .single();

    // Get event info
    let eventTitle = 'spotkanie';
    if (guestToken.event_id) {
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', guestToken.event_id)
        .single();
      if (event) eventTitle = event.title;
    }

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      console.warn("[send-guest-thank-you-email] SMTP not configured");
      return new Response(JSON.stringify({ error: 'SMTP not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const inviterName = inviter ? `${inviter.first_name} ${inviter.last_name}` : 'Zespół Pure Life';
    const inviterEmail = inviter?.email || '';
    const inviterPhone = inviter?.phone_number || '';
    const durationMin = Math.round((analytics.duration_seconds || 0) / 60);

    const subject = `Dziękujemy za udział w spotkaniu: ${eventTitle}`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Dziękujemy za udział!</h1>
  </div>
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
    <p>Cześć <strong>${guestToken.first_name}</strong>,</p>
    <p>Bardzo dziękujemy za uczestnictwo w spotkaniu <strong>"${eventTitle}"</strong>. Twoja obecność przez ${durationMin} minut była dla nas niezwykle cenna!</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0; color: #667eea;">Twoja osoba kontaktowa:</h3>
      <p style="margin: 5px 0;"><strong>${inviterName}</strong></p>
      ${inviterEmail ? `<p style="margin: 5px 0;">📧 <a href="mailto:${inviterEmail}">${inviterEmail}</a></p>` : ''}
      ${inviterPhone ? `<p style="margin: 5px 0;">📱 ${inviterPhone}</p>` : ''}
    </div>

    <p>Skontaktuj się z <strong>${inviterName}</strong>, aby dowiedzieć się więcej o:</p>
    <ul style="line-height: 1.8;">
      <li>📚 Kolejnych szkoleniach i spotkaniach</li>
      <li>🌿 Produktach Eqology i stylu życia Pure Life</li>
      <li>🤝 Możliwości dołączenia do zespołu Pure Life i Eqology</li>
      <li>💡 Tematach poruszanych na dzisiejszym spotkaniu</li>
    </ul>

    <div style="text-align: center; margin-top: 30px;">
      ${inviterEmail ? `<a href="mailto:${inviterEmail}?subject=Kontakt po spotkaniu: ${eventTitle}" style="background: #667eea; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Napisz do ${inviterName}</a>` : ''}
    </div>

    <p style="margin-top: 30px; color: #666; font-size: 12px; text-align: center;">
      Ta wiadomość została wysłana automatycznie przez platformę Pure Life Center.
    </p>
  </div>
</body>
</html>`;

    await sendSmtpEmail(smtpSettings, guestToken.email, subject, htmlBody);

    // Mark email as sent
    if (analytics) {
      await supabase.from('meeting_guest_analytics').update({
        thank_you_email_sent: true,
        thank_you_email_sent_at: new Date().toISOString(),
      }).eq('id', analytics.id);
    }

    // Log email
    await supabase.from("email_logs").insert({
      recipient_email: guestToken.email,
      subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: {
        type: 'guest_thank_you',
        event_id: guestToken.event_id,
        guest_token_id,
        inviter_user_id: guestToken.inviter_user_id,
      },
    });

    console.log(`[send-guest-thank-you-email] Email sent to ${guestToken.email}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-guest-thank-you-email] Error:', error);
    return new Response(JSON.stringify({ error: 'Błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
