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
  const senderDomain = settings.sender_email.split('@')[1] || 'localhost';
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
  await sendCommand(`EHLO ${senderDomain}`);

  if (settings.encryption_type === "starttls") {
    await sendCommand("STARTTLS");
    conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
    await sendCommand(`EHLO ${senderDomain}`);
  }

  await sendCommand(`AUTH LOGIN`);
  await sendCommand(base64Encode(settings.username));
  await sendCommand(base64Encode(settings.password));

  const mailFromResp = await sendCommand(`MAIL FROM:<${settings.sender_email}>`);
  if (!mailFromResp.startsWith('250')) throw new Error(`MAIL FROM rejected: ${mailFromResp}`);

  const rcptResp = await sendCommand(`RCPT TO:<${to}>`);
  if (!rcptResp.startsWith('250')) throw new Error(`RCPT TO rejected: ${rcptResp}`);

  const dataResp = await sendCommand("DATA");
  if (!dataResp.startsWith('354')) throw new Error(`DATA rejected: ${dataResp}`);

  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${senderDomain}>`;
  const plainText = htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  const message = [
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    `From: "${settings.sender_name}" <${settings.sender_email}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
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
    btoa(unescape(encodeURIComponent(plainText))),
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

  const sendResp = await sendCommand(message);
  if (!sendResp.startsWith('250')) throw new Error(`Failed to send: ${sendResp}`);

  await sendCommand("QUIT");
  try { conn.close(); } catch {}
}

const LOGO_URL = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png';

function buildThankYouHtml(params: {
  recipientName: string;
  eventTitle: string;
  inviterName?: string;
  inviterEmail?: string;
  inviterPhone?: string;
}): string {
  const { recipientName, eventTitle, inviterName, inviterEmail, inviterPhone } = params;
  const hasInviter = inviterName && inviterName !== 'Zespół Pure Life';

  const inviterContactSection = hasInviter ? `
    <div style="background: #FFF9ED; border: 2px solid #D4A843; border-radius: 12px; padding: 25px; margin: 25px 0;">
      <h2 style="margin: 0 0 5px 0; color: #D4A843; font-size: 18px;">👤 Twoja osoba kontaktowa</h2>
      <p style="margin: 0 0 15px 0; color: #8B6914; font-size: 13px;">Skontaktuj się bezpośrednio!</p>
      
      <p style="margin: 5px 0; font-size: 16px;"><strong>${inviterName}</strong></p>
      ${inviterEmail ? `<p style="margin: 5px 0; font-size: 14px;">📧 <a href="mailto:${inviterEmail}" style="color: #D4A843; text-decoration: none;">${inviterEmail}</a></p>` : ''}
      ${inviterPhone ? `<p style="margin: 5px 0; font-size: 14px;">📱 ${inviterPhone}</p>` : ''}
      
      <p style="font-size: 14px; line-height: 1.7; margin-top: 15px; color: #555;">
        <strong>${inviterName}</strong> zaprosił/a Cię na to wydarzenie i jest Twoim <strong>bezpośrednim kontaktem</strong>. 
        To właśnie ta osoba pomoże Ci dowiedzieć się więcej i wesprze Cię na każdym kroku.
      </p>
    </div>

    <p style="font-size: 15px; line-height: 1.7;">
      Skontaktuj się z <strong>${inviterName}</strong>, aby dowiedzieć się więcej o:
    </p>
  ` : `
    <p style="font-size: 15px; line-height: 1.7;">
      Chcesz dowiedzieć się więcej? Skontaktuj się z nami:
    </p>
  `;

  const ctaButton = hasInviter && inviterEmail
    ? `<a href="mailto:${inviterEmail}?subject=Kontakt po wydarzeniu: ${eventTitle}" style="display: inline-block; background: linear-gradient(135deg, #D4A843, #B8912A); color: white; padding: 16px 40px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 16px;">✉️ Napisz do ${inviterName}</a>`
    : `<a href="mailto:support@purelife.info.pl?subject=Kontakt po wydarzeniu: ${eventTitle}" style="display: inline-block; background: linear-gradient(135deg, #D4A843, #B8912A); color: white; padding: 16px 40px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 16px;">✉️ Napisz do nas</a>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f4f4;">
  <div style="background: linear-gradient(135deg, #D4A843 0%, #B8912A 100%); padding: 30px; text-align: center;">
    <img src="${LOGO_URL}" alt="Pure Life Center" style="max-width: 180px; height: auto; margin-bottom: 15px;" />
    <h1 style="color: white; margin: 0; font-size: 22px; text-shadow: 0 1px 3px rgba(0,0,0,0.2);">Dziękujemy za udział!</h1>
  </div>
  <div style="background: white; padding: 30px;">
    <p style="font-size: 16px;">Cześć <strong>${recipientName}</strong>,</p>
    <p style="font-size: 15px; line-height: 1.7;">
      Bardzo dziękujemy za uczestnictwo w wydarzeniu <strong>"${eventTitle}"</strong>. 
      Twoja obecność była dla nas niezwykle cenna i cieszymy się, że mogliśmy wspólnie spędzić ten czas!
    </p>

    ${inviterContactSection}

    <ul style="line-height: 2; font-size: 15px; padding-left: 20px;">
      <li>📚 Kolejnych szkoleniach i spotkaniach</li>
      <li>🌿 Produktach Eqology i stylu życia Pure Life</li>
      <li>🤝 Możliwości dołączenia do zespołu Pure Life i Eqology</li>
      <li>💡 Tematach poruszanych na dzisiejszym wydarzeniu</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      ${ctaButton}
    </div>

    <div style="background: #f8f8f8; border-radius: 8px; padding: 15px; margin-top: 25px; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #888;">
        💬 Dodatkowe wsparcie: <a href="mailto:support@purelife.info.pl" style="color: #D4A843; text-decoration: none;">support@purelife.info.pl</a>
      </p>
    </div>

    <p style="margin-top: 30px; color: #999; font-size: 12px; text-align: center;">
      Ta wiadomość została wysłana automatycznie przez platformę Pure Life Center.
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, recipient_email, recipient_name, event_title, inviter_user_id, source_type, source_id } = await req.json();

    if (!event_id || !recipient_email || !recipient_name || !event_title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      console.warn("[send-post-event-thank-you] SMTP not configured");
      return new Response(JSON.stringify({ error: 'SMTP not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Get inviter info if available
    let inviterName = 'Zespół Pure Life';
    let inviterEmail = '';
    let inviterPhone = '';

    if (inviter_user_id) {
      const { data: inviter } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number')
        .eq('user_id', inviter_user_id)
        .single();

      if (inviter) {
        inviterName = `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || 'Zespół Pure Life';
        inviterEmail = inviter.email || '';
        inviterPhone = inviter.phone_number || '';
      }
    }

    const subject = `Dziękujemy za udział w wydarzeniu: ${event_title}`;
    const htmlBody = buildThankYouHtml({
      recipientName: recipient_name,
      eventTitle: event_title,
      inviterName,
      inviterEmail,
      inviterPhone,
    });

    await sendSmtpEmail(smtpSettings, recipient_email, subject, htmlBody);

    // Log email
    await supabase.from("email_logs").insert({
      recipient_email,
      subject,
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: {
        type: 'post_event_thank_you',
        event_id,
        inviter_user_id,
        source_type,
        source_id,
      },
    });

    console.log(`[send-post-event-thank-you] Email sent to ${recipient_email} for event ${event_title}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-post-event-thank-you] Error:', error);
    return new Response(JSON.stringify({ error: 'Błąd serwera' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
