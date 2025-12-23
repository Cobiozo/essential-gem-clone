import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GroupEmailRequest {
  subject?: string;
  content?: string;
  template_id?: string;
  variables?: Record<string, string>;
  recipients: {
    client: boolean;
    partner: boolean;
    specjalista: boolean;
  };
  senderEmail?: string;
  senderName?: string;
}

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: string;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  footer_html: string | null;
  variables: any;
}

// Replace template variables with actual values
function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, value);
  }
  return result;
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

// Real SMTP email sending
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlContent: string,
  senderName?: string
): Promise<{ success: boolean; error?: string }> {
  const { smtp_host, smtp_port, smtp_encryption, smtp_username, smtp_password, sender_email, sender_name } = settings;
  
  const fromName = senderName || sender_name || 'System';
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[send-group-email] Starting...");
    
    const requestData: GroupEmailRequest = await req.json();
    console.log("[send-group-email] Request:", JSON.stringify({ 
      ...requestData, 
      content: requestData.content ? '[content present]' : undefined 
    }));
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch SMTP settings from database
    console.log("[send-group-email] Fetching SMTP settings...");
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (smtpError || !smtpSettings) {
      console.error("[send-group-email] SMTP settings error:", smtpError);
      return new Response(
        JSON.stringify({ 
          error: "Brak aktywnej konfiguracji SMTP. Skonfiguruj ustawienia SMTP w panelu administracyjnym.",
          details: smtpError?.message 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[send-group-email] SMTP settings loaded:", smtpSettings.smtp_host);

    // 2. Determine email content - from template or direct input
    let finalSubject = requestData.subject || '';
    let finalContent = requestData.content || '';
    let templateId: string | null = null;

    if (requestData.template_id) {
      console.log("[send-group-email] Fetching template:", requestData.template_id);
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', requestData.template_id)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error("[send-group-email] Template error:", templateError);
        return new Response(
          JSON.stringify({ error: "Nie znaleziono wybranego szablonu", details: templateError?.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      templateId = template.id;
      finalSubject = template.subject;
      finalContent = template.body_html;
      
      // Add footer if exists
      if (template.footer_html) {
        finalContent += `<div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">${template.footer_html}</div>`;
      }
      
      console.log("[send-group-email] Template loaded:", template.name);
    }

    // Validate we have content
    if (!finalSubject || !finalContent) {
      return new Response(
        JSON.stringify({ error: "Temat i treść wiadomości są wymagane" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch recipients
    const roleFilters: string[] = [];
    if (requestData.recipients.client) roleFilters.push('client', 'user');
    if (requestData.recipients.partner) roleFilters.push('partner');
    if (requestData.recipients.specjalista) roleFilters.push('specjalista');

    if (roleFilters.length === 0) {
      return new Response(
        JSON.stringify({ error: "Wybierz przynajmniej jedną grupę odbiorców" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-group-email] Fetching profiles for roles:", roleFilters);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name, role')
      .in('role', roleFilters)
      .eq('is_active', true);

    if (profilesError) {
      console.error("[send-group-email] Profiles error:", profilesError);
      return new Response(
        JSON.stringify({ error: "Błąd pobierania użytkowników", details: profilesError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Brak aktywnych użytkowników w wybranych grupach" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-group-email] Found ${profiles.length} recipients`);

    // 4. Build HTML email wrapper
    const buildEmailHtml = (content: string, recipientName?: string) => {
      // Replace user-specific variables
      let personalizedContent = content;
      if (recipientName) {
        personalizedContent = personalizedContent.replace(/\{\{imię\}\}/gi, recipientName);
      }
      if (requestData.variables) {
        personalizedContent = replaceVariables(personalizedContent, requestData.variables);
      }

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${finalSubject}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${personalizedContent}
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
              <p>Wiadomość wysłana przez system Pure Life</p>
              <p>Nadawca: ${requestData.senderName || smtpSettings.sender_name}</p>
            </div>
          </body>
        </html>
      `;
    };

    // 5. Send emails and log results
    let successCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const profile of profiles) {
      const recipientName = profile.first_name || '';
      const htmlContent = buildEmailHtml(finalContent, recipientName);
      
      // Replace any remaining profile-specific variables
      let personalizedSubject = finalSubject
        .replace(/\{\{imię\}\}/gi, recipientName)
        .replace(/\{\{nazwisko\}\}/gi, profile.last_name || '')
        .replace(/\{\{email\}\}/gi, profile.email);

      const result = await sendSmtpEmail(
        smtpSettings,
        profile.email,
        personalizedSubject,
        htmlContent,
        requestData.senderName
      );

      // Log to email_logs
      await supabase.from('email_logs').insert({
        template_id: templateId,
        recipient_email: profile.email,
        recipient_user_id: profile.user_id,
        subject: personalizedSubject,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
        metadata: {
          recipients_group: roleFilters,
          sender_name: requestData.senderName || smtpSettings.sender_name
        }
      });

      if (result.success) {
        successCount++;
      } else {
        errors.push({ email: profile.email, error: result.error || 'Unknown error' });
      }
      
      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[send-group-email] Completed: ${successCount}/${profiles.length} sent`);

    if (successCount === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Nie udało się wysłać żadnego emaila",
          details: errors
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Wysłano ${successCount} z ${profiles.length} wiadomości`,
        recipientCount: successCount,
        totalRecipients: profiles.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-group-email] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Wewnętrzny błąd serwera", 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
