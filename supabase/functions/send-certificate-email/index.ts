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

// Base64 encode for SMTP AUTH
function base64Encode(str: string): string {
  return btoa(str);
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

// Real SMTP email sending - copied from send-group-email
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
    // Connect based on encryption type
    if (smtp_encryption === 'ssl') {
      conn = await withTimeout(
        Deno.connectTls({
          hostname: smtp_host,
          port: smtp_port,
        }),
        15000,
        'SSL connection timeout'
      );
    } else {
      conn = await withTimeout(
        Deno.connect({
          hostname: smtp_host,
          port: smtp_port,
        }),
        15000,
        'TCP connection timeout'
      );
    }
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    // Helper to read response
    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(4096);
      const bytesRead = await withTimeout(
        conn!.read(buffer),
        10000,
        'Read timeout'
      );
      if (bytesRead === null) return '';
      return decoder.decode(buffer.subarray(0, bytesRead));
    };
    
    // Helper to send command
    const sendCommand = async (command: string): Promise<string> => {
      await conn!.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    };
    
    // Read greeting
    const greeting = await readResponse();
    console.log(`[SMTP] Greeting: ${greeting.trim()}`);
    
    if (!greeting.startsWith('220')) {
      throw new Error(`Invalid SMTP greeting: ${greeting}`);
    }
    
    // EHLO
    const ehloResponse = await sendCommand(`EHLO ${smtp_host}`);
    console.log(`[SMTP] EHLO response received`);
    
    if (!ehloResponse.includes('250')) {
      throw new Error(`EHLO failed: ${ehloResponse}`);
    }
    
    // Handle STARTTLS if needed
    if (smtp_encryption === 'starttls' && ehloResponse.includes('STARTTLS')) {
      const starttlsResponse = await sendCommand('STARTTLS');
      if (starttlsResponse.startsWith('220')) {
        // Upgrade connection to TLS
        conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: smtp_host });
        // Re-send EHLO after STARTTLS
        await sendCommand(`EHLO ${smtp_host}`);
      }
    }
    
    // AUTH LOGIN
    const authResponse = await sendCommand('AUTH LOGIN');
    if (!authResponse.startsWith('334')) {
      throw new Error(`AUTH LOGIN failed: ${authResponse}`);
    }
    
    // Send username (base64)
    const userResponse = await sendCommand(base64Encode(smtp_username));
    if (!userResponse.startsWith('334')) {
      throw new Error(`Username rejected: ${userResponse}`);
    }
    
    // Send password (base64)
    const passResponse = await sendCommand(base64Encode(smtp_password));
    if (!passResponse.startsWith('235')) {
      throw new Error(`Authentication failed: ${passResponse}`);
    }
    console.log(`[SMTP] Authentication successful`);
    
    // MAIL FROM
    const mailFromResponse = await sendCommand(`MAIL FROM:<${fromEmail}>`);
    if (!mailFromResponse.startsWith('250')) {
      throw new Error(`MAIL FROM rejected: ${mailFromResponse}`);
    }
    
    // RCPT TO
    const rcptToResponse = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptToResponse.startsWith('250')) {
      throw new Error(`RCPT TO rejected: ${rcptToResponse}`);
    }
    
    // DATA
    const dataResponse = await sendCommand('DATA');
    if (!dataResponse.startsWith('354')) {
      throw new Error(`DATA command rejected: ${dataResponse}`);
    }
    
    // Build email message
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const emailMessage = [
      `From: "${fromName}" <${fromEmail}>`,
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
      base64Encode(htmlContent.replace(/<[^>]*>/g, '')),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(htmlContent),
      ``,
      `--${boundary}--`,
      `.`
    ].join('\r\n');
    
    const endDataResponse = await sendCommand(emailMessage);
    if (!endDataResponse.startsWith('250')) {
      throw new Error(`Email data rejected: ${endDataResponse}`);
    }
    
    console.log(`[SMTP] Email sent successfully to ${to}`);
    
    // QUIT
    await sendCommand('QUIT');
    
    return { success: true };
    
  } catch (error: any) {
    console.error(`[SMTP] Error sending to ${to}:`, error.message);
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (_) {}
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
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, moduleId, certificateId, moduleTitle, userName } = await req.json();
    console.log(`[send-certificate-email] Params: userId=${userId}, moduleId=${moduleId}, certificateId=${certificateId}`);

    if (!userId || !moduleId || !certificateId) {
      throw new Error('userId, moduleId, and certificateId are required');
    }

    // 1. Get SMTP settings from database (same as send-group-email)
    console.log('[send-certificate-email] Fetching SMTP settings from database...');
    const { data: smtpSettings, error: smtpError } = await supabaseAdmin
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (smtpError || !smtpSettings) {
      console.error('[send-certificate-email] SMTP settings error:', smtpError);
      throw new Error('Brak aktywnej konfiguracji SMTP. Skonfiguruj ustawienia SMTP w panelu administracyjnym.');
    }
    console.log(`[send-certificate-email] SMTP settings loaded: ${smtpSettings.smtp_host}:${smtpSettings.smtp_port}`);

    // 2. Get user email
    console.log('[send-certificate-email] Fetching user profile...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.email) {
      console.error('[send-certificate-email] Profile error:', profileError);
      throw new Error('User profile or email not found');
    }

    const userEmail = profile.email;
    const displayName = userName || (profile.first_name && profile.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile.email);

    console.log(`[send-certificate-email] Sending to: ${userEmail}, name: ${displayName}`);

    // 3. Get certificate file path
    console.log('[send-certificate-email] Fetching certificate...');
    const { data: certificate, error: certError } = await supabaseAdmin
      .from('certificates')
      .select('file_url')
      .eq('id', certificateId)
      .single();

    if (certError || !certificate?.file_url) {
      console.error('[send-certificate-email] Certificate error:', certError);
      throw new Error('Certificate not found');
    }

    // Check if file_url is a placeholder
    if (certificate.file_url.startsWith('pending-generation')) {
      console.error('[send-certificate-email] Certificate is still pending generation');
      throw new Error('Certificate is still being generated');
    }

    // 4. Generate signed URL for certificate (valid for 7 days)
    console.log('[send-certificate-email] Generating signed URL...');
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUrl(certificate.file_url, 60 * 60 * 24 * 7); // 7 days

    if (urlError) {
      console.error('[send-certificate-email] Signed URL error:', urlError);
      throw new Error('Failed to generate certificate download URL');
    }

    const downloadUrl = signedUrlData.signedUrl;
    console.log('[send-certificate-email] Signed URL generated successfully');

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

    // 6. Send email via SMTP (using the same function as send-group-email)
    console.log('[send-certificate-email] Sending email via SMTP...');
    const result = await sendSmtpEmail(
      smtpSettings,
      userEmail,
      emailSubject,
      emailBody,
      smtpSettings.sender_name
    );

    if (!result.success) {
      console.error('[send-certificate-email] SMTP send failed:', result.error);
      throw new Error(`Failed to send email: ${result.error}`);
    }

    console.log('[send-certificate-email] ✅ Email sent successfully via SMTP');

    // 7. Log the email
    await supabaseAdmin
      .from('email_logs')
      .insert({
        recipient_email: userEmail,
        recipient_user_id: userId,
        subject: emailSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { certificateId, moduleId, moduleTitle, method: 'smtp' }
      });

    console.log('[send-certificate-email] ✅ Email logged successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Certificate email sent successfully via SMTP'
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
