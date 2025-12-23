import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  template_id: string;
  recipient_user_id: string;
  custom_variables?: Record<string, string>;
}

interface SmtpSettings {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
}

// Base64 encode for SMTP AUTH
function base64Encode(str: string): string {
  return btoa(str);
}

// Helper function to add timeout to promises
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
  console.log(`[SMTP] Attempting to send email to ${to}`);
  console.log(`[SMTP] Using server: ${settings.host}:${settings.port} (${settings.encryption})`);

  let conn: Deno.Conn | null = null;
  
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Connect based on encryption type
    if (settings.encryption === 'ssl') {
      console.log('[SMTP] Connecting with SSL/TLS...');
      conn = await withTimeout(
        Deno.connectTls({
          hostname: settings.host,
          port: settings.port,
        }),
        30000
      );
    } else {
      console.log('[SMTP] Connecting without encryption...');
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
      const response = decoder.decode(buffer.subarray(0, n));
      console.log('[SMTP] Response:', response.trim());
      return response;
    };

    const sendCommand = async (command: string, hideLog = false): Promise<string> => {
      if (!hideLog) {
        console.log('[SMTP] Sending:', command.trim());
      } else {
        console.log('[SMTP] Sending: [HIDDEN - credentials]');
      }
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    // Read initial greeting
    await readResponse();

    // EHLO
    await sendCommand(`EHLO ${settings.host}`);

    // STARTTLS if needed
    if (settings.encryption === 'starttls') {
      console.log('[SMTP] Initiating STARTTLS...');
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, {
        hostname: settings.host,
      });
      await sendCommand(`EHLO ${settings.host}`);
    }

    // AUTH LOGIN
    console.log('[SMTP] Authenticating...');
    await sendCommand('AUTH LOGIN');
    await sendCommand(base64Encode(settings.username), true);
    const authResponse = await sendCommand(base64Encode(settings.password), true);
    
    if (!authResponse.startsWith('235')) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    // MAIL FROM
    await sendCommand(`MAIL FROM:<${settings.from_email}>`);

    // RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);

    // DATA
    await sendCommand('DATA');

    // Email content with proper headers
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

    // QUIT
    await sendCommand('QUIT');
    conn.close();

    console.log('[SMTP] Email sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    if (conn) {
      try { conn.close(); } catch {}
    }
    return { success: false, error: error.message };
  }
}

// Replace template variables
function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

serve(async (req) => {
  console.log('[send-single-email] Request received:', req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Only admins can force send emails");
    }

    const { template_id, recipient_user_id, custom_variables = {} }: SendEmailRequest = await req.json();
    console.log('[send-single-email] Request data:', { template_id, recipient_user_id });

    // Fetch SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      throw new Error("No active SMTP configuration found. Please configure SMTP settings first.");
    }

    const smtpSettings: SmtpSettings = {
      host: smtpData.host,
      port: smtpData.port,
      encryption: smtpData.encryption,
      username: smtpData.username,
      password: smtpData.password,
      from_email: smtpData.from_email,
      from_name: smtpData.from_name,
    };

    // Fetch email template
    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !templateData) {
      throw new Error("Email template not found");
    }

    // Fetch recipient user data
    const { data: recipientData, error: recipientError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name, eq_id")
      .eq("user_id", recipient_user_id)
      .single();

    if (recipientError || !recipientData) {
      throw new Error("Recipient user not found");
    }

    // Get user role
    const { data: recipientRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", recipient_user_id)
      .single();

    // Build variables for replacement
    const variables: Record<string, string> = {
      imię: recipientData.first_name || '',
      nazwisko: recipientData.last_name || '',
      email: recipientData.email,
      rola: recipientRole?.role || 'client',
      data: new Date().toLocaleDateString('pl-PL'),
      godzina: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      link_aktywacyjny: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/`,
      link_resetowania: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`,
      ...custom_variables,
    };

    // Replace variables in template
    const subject = replaceVariables(templateData.subject, variables);
    let htmlBody = replaceVariables(templateData.body_html, variables);
    
    if (templateData.footer_html) {
      htmlBody += replaceVariables(templateData.footer_html, variables);
    }

    // Send email
    const result = await sendSmtpEmail(
      smtpSettings,
      recipientData.email,
      subject,
      htmlBody
    );

    // Log the email
    await supabase.from("email_logs").insert({
      template_id: template_id,
      recipient_email: recipientData.email,
      recipient_user_id: recipient_user_id,
      subject: subject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        forced_by_admin: user.id,
        custom_variables 
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    console.log('[send-single-email] Email sent successfully to:', recipientData.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email wysłany do ${recipientData.email}`,
        recipient: {
          email: recipientData.email,
          name: `${recipientData.first_name || ''} ${recipientData.last_name || ''}`.trim(),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-single-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
