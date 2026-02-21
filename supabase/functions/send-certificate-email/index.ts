import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: string;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
}

// Base64 encode for SMTP AUTH (ASCII only - for credentials)
function base64EncodeAscii(str: string): string {
  return btoa(str);
}

// Base64 encode for UTF-8 content (handles Polish characters)
function base64EncodeUtf8(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Timeout wrapper for promises
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
}

// Real SMTP email sending
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlContent: string,
  senderName?: string
): Promise<{ success: boolean; error?: string }> {
  const { smtp_host, smtp_port, smtp_encryption, smtp_username, smtp_password, sender_email, sender_name } = settings;
  
  const fromName = senderName || sender_name || 'Pure Life';
  const fromEmail = sender_email;
  
  console.log(`[SMTP] Sending email to ${to} via ${smtp_host}:${smtp_port} (${smtp_encryption})`);
  
  let conn: Deno.TlsConn | Deno.TcpConn | null = null;
  
  try {
    if (smtp_encryption === 'ssl') {
      conn = await withTimeout(
        Deno.connectTls({ hostname: smtp_host, port: smtp_port }),
        15000, 'SSL connection timeout'
      );
    } else {
      conn = await withTimeout(
        Deno.connect({ hostname: smtp_host, port: smtp_port }),
        15000, 'TCP connection timeout'
      );
    }
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const bytesRead = await withTimeout(conn!.read(buffer), 10000, 'Read timeout');
      if (bytesRead === null) return '';
      return decoder.decode(buffer.subarray(0, bytesRead));
    };
    
    const sendCommand = async (command: string): Promise<string> => {
      await conn!.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    };
    
    const greeting = await readResponse();
    console.log(`[SMTP] Greeting: ${greeting.trim()}`);
    if (!greeting.startsWith('220')) throw new Error(`Invalid SMTP greeting: ${greeting}`);
    
    const ehloResponse = await sendCommand(`EHLO ${smtp_host}`);
    if (!ehloResponse.includes('250')) throw new Error(`EHLO failed: ${ehloResponse}`);
    
    if (smtp_encryption === 'starttls' && ehloResponse.includes('STARTTLS')) {
      const starttlsResponse = await sendCommand('STARTTLS');
      if (starttlsResponse.startsWith('220')) {
        conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: smtp_host });
        await sendCommand(`EHLO ${smtp_host}`);
      }
    }
    
    const authResponse = await sendCommand('AUTH LOGIN');
    if (!authResponse.startsWith('334')) throw new Error(`AUTH LOGIN failed: ${authResponse}`);
    
    const userResponse = await sendCommand(base64EncodeAscii(smtp_username));
    if (!userResponse.startsWith('334')) throw new Error(`Username rejected: ${userResponse}`);
    
    const passResponse = await sendCommand(base64EncodeAscii(smtp_password));
    if (!passResponse.startsWith('235')) throw new Error(`Authentication failed: ${passResponse}`);
    console.log(`[SMTP] Authentication successful`);
    
    const mailFromResponse = await sendCommand(`MAIL FROM:<${fromEmail}>`);
    if (!mailFromResponse.startsWith('250')) throw new Error(`MAIL FROM rejected: ${mailFromResponse}`);
    
    const rcptToResponse = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptToResponse.startsWith('250')) throw new Error(`RCPT TO rejected: ${rcptToResponse}`);
    
    const dataResponse = await sendCommand('DATA');
    if (!dataResponse.startsWith('354')) throw new Error(`DATA command rejected: ${dataResponse}`);
    
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const emailMessage = [
      `From: =?UTF-8?B?${base64EncodeUtf8(fromName)}?= <${fromEmail}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64EncodeUtf8(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64EncodeUtf8(htmlContent.replace(/<[^>]*>/g, '')),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64EncodeUtf8(htmlContent),
      ``,
      `--${boundary}--`,
      `.`
    ].join('\r\n');
    
    const endDataResponse = await sendCommand(emailMessage);
    if (!endDataResponse.startsWith('250')) throw new Error(`Email data rejected: ${endDataResponse}`);
    
    console.log(`[SMTP] Email sent successfully to ${to}`);
    await sendCommand('QUIT');
    
    return { success: true };
    
  } catch (error: any) {
    console.error(`[SMTP] Error sending to ${to}:`, error.message);
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try { conn.close(); } catch (_) {}
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[send-certificate-email] Starting...');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, moduleId, certificateId, moduleTitle, userName } = await req.json();
    console.log(`[send-certificate-email] Params: userId=${userId}, moduleId=${moduleId}, certificateId=${certificateId}`);

    if (!userId || !moduleId || !certificateId) {
      throw new Error('userId, moduleId, and certificateId are required');
    }

    // 1. Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabaseAdmin
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (smtpError || !smtpSettings) {
      throw new Error('Brak aktywnej konfiguracji SMTP. Skonfiguruj ustawienia SMTP w panelu administracyjnym.');
    }

    // 2. Get user email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error('User profile or email not found');
    }

    const userEmail = profile.email;
    const displayName = userName || (profile.first_name && profile.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile.email);

    // 3. Get certificate file path
    const { data: certificate, error: certError } = await supabaseAdmin
      .from('certificates')
      .select('file_url')
      .eq('id', certificateId)
      .single();

    if (certError || !certificate?.file_url) {
      throw new Error('Certificate not found');
    }

    if (certificate.file_url.startsWith('pending-generation')) {
      throw new Error('Certificate is still being generated');
    }

    let filePath = certificate.file_url;
    if (filePath.includes('/storage/v1/object/')) {
      const parts = filePath.split('certificates/');
      if (parts.length > 1) filePath = parts[1];
    }

    // 4. Generate signed URL (valid for 7 days)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    if (urlError) throw new Error('Failed to generate certificate download URL');

    const downloadUrl = signedUrlData.signedUrl;

    // 5. Build email content
    const emailSubject = `🎉 Gratulacje! Twój certyfikat ukończenia szkolenia "${moduleTitle}"`;
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0;">🎉 Gratulacje!</h1>
          </div>
          
          <p style="font-size: 16px;">Drogi/Droga <strong>${displayName}</strong>,</p>
          
          <p style="font-size: 16px;">Z wielką przyjemnością informujemy, że pomyślnie ukończyłeś/aś szkolenie:</p>
          
          <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <h2 style="color: #166534; margin: 0;">${moduleTitle}</h2>
          </div>
          
          <p style="font-size: 16px;">Twój certyfikat jest gotowy do pobrania. Kliknij poniższy przycisk, aby go pobrać:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" 
               style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              📥 Pobierz Certyfikat
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">
            Link do pobrania jest ważny przez 7 dni. Po tym czasie możesz pobrać certyfikat 
            bezpośrednio z panelu użytkownika w sekcji Szkolenia.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Dziękujemy za ukończenie szkolenia!<br>
            Zespół Pure Life
          </p>
        </body>
      </html>
    `;

    // 6. Send email to user via SMTP
    console.log('[send-certificate-email] Sending email to user...');
    const result = await sendSmtpEmail(smtpSettings, userEmail, emailSubject, emailBody, smtpSettings.sender_name);

    if (!result.success) {
      throw new Error(`Failed to send email: ${result.error}`);
    }
    console.log('[send-certificate-email] ✅ Email sent to user');

    // 7. Send CC copy to support@purelife.info.pl
    const supportEmail = 'support@purelife.info.pl';
    const supportSubject = `[KOPIA] Certyfikat: ${displayName} - "${moduleTitle}"`;
    console.log(`[send-certificate-email] Sending CC to ${supportEmail}...`);
    
    const ccResult = await sendSmtpEmail(smtpSettings, supportEmail, supportSubject, emailBody, smtpSettings.sender_name);
    
    if (!ccResult.success) {
      console.warn(`[send-certificate-email] ⚠️ CC to support failed: ${ccResult.error}`);
      // Don't throw - CC failure should not block the main flow
    } else {
      console.log('[send-certificate-email] ✅ CC sent to support');
    }

    // 8. Update email_sent_at in certificates table
    const emailSentAt = new Date().toISOString();
    await supabaseAdmin
      .from('certificates')
      .update({ email_sent_at: emailSentAt })
      .eq('id', certificateId);
    console.log('[send-certificate-email] ✅ email_sent_at updated');

    // 9. Log the email
    await supabaseAdmin
      .from('email_logs')
      .insert({
        recipient_email: userEmail,
        recipient_user_id: userId,
        subject: emailSubject,
        status: 'sent',
        sent_at: emailSentAt,
        metadata: { certificateId, moduleId, moduleTitle, method: 'smtp', cc_support: ccResult.success }
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Certificate email sent successfully via SMTP',
      emailSentAt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[send-certificate-email] ❌ Error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
