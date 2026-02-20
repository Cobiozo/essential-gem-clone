import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  userId: string;
  approvalType: 'guardian' | 'admin' | 'leader';
  guardianName?: string;
  approverId?: string;
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

// Base64 encode for SMTP (handles UTF-8)
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

// Send email via SMTP
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[SMTP] Sending approval email to ${to}`);
  console.log(`[SMTP] Server: ${settings.host}:${settings.port} (${settings.encryption})`);

  let conn: Deno.Conn | null = null;
  
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (settings.encryption === 'ssl') {
      conn = await withTimeout(
        Deno.connectTls({ hostname: settings.host, port: settings.port }),
        30000
      );
    } else {
      conn = await withTimeout(
        Deno.connect({ hostname: settings.host, port: settings.port }),
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
        console.log('[SMTP] Sending: [HIDDEN]');
      }
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
      throw new Error(`Failed to send: ${dataResponse}`);
    }

    await sendCommand('QUIT');
    conn.close();

    console.log('[SMTP] Approval email sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try { conn.close(); } catch (closeError) {
        console.warn('[SMTP] Error closing connection:', closeError);
      }
    }
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, approvalType, guardianName, approverId }: ApprovalEmailRequest = await req.json();
    console.log("[send-approval-email] Request:", { userId, approvalType, guardianName, approverId });

    if (!userId || !approvalType) {
      throw new Error("Missing required parameters: userId and approvalType");
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User not found");
    }

    // Get SMTP settings
    const { data: smtpData, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpData) {
      throw new Error("No active SMTP configuration found");
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

    // Determine template based on approval type
    // leader uses the same template as admin (full account activation)
    const templateName = approvalType === 'guardian' ? 'guardian_approval' : 'admin_approval';

    // Get email template
    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", templateName)
      .eq("is_active", true)
      .single();

    if (templateError || !templateData) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    // Get APP_BASE_URL from page_settings
    const { data: settingsData } = await supabase
      .from('page_settings')
      .select('app_base_url')
      .limit(1)
      .maybeSingle();
    
    const baseUrl = settingsData?.app_base_url || 'https://purelife.lovable.app';
    const loginUrl = `${baseUrl}/auth`;

    // Build variables based on approval type
    let variables: Record<string, string> = {
      imię: profile.first_name || '',
      nazwisko: profile.last_name || '',
      link_logowania: loginUrl,
    };

    if (approvalType === 'guardian') {
      variables.guardian_name = guardianName || 'Twój opiekun';
    } else if (approvalType === 'admin') {
      // Get assigned training modules for admin approval email
      const { data: assignments } = await supabase
        .from("training_assignments")
        .select(`
          module_id,
          training_modules:module_id (title)
        `)
        .eq("user_id", userId)
        .eq("is_completed", false);

      let trainingModulesList = '<p style="color: #666;">Brak przypisanych szkoleń</p>';
      
      if (assignments && assignments.length > 0) {
        const moduleItems = assignments
          .map((a: any) => `<li>${a.training_modules?.title || 'Nieznany moduł'}</li>`)
          .join('');
        trainingModulesList = `<ul style="margin: 10px 0; padding-left: 20px;">${moduleItems}</ul>`;
      }

      variables.training_modules_list = trainingModulesList;
    }

    // Replace variables in template
    const subject = replaceVariables(templateData.subject, variables);
    let htmlBody = replaceVariables(templateData.body_html, variables);
    if (templateData.footer_html) {
      htmlBody += replaceVariables(templateData.footer_html, variables);
    }

    // Send email via SMTP
    const result = await sendSmtpEmail(smtpSettings, profile.email, subject, htmlBody);

    // Log the email
    await supabase.from("email_logs").insert({
      template_id: templateData.id,
      recipient_email: profile.email,
      recipient_user_id: userId,
      subject: subject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        approval_type: approvalType,
        guardian_name: guardianName,
        approver_id: approverId,
        event: `${approvalType}_approval`
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    console.log("[send-approval-email] Email sent successfully to:", profile.email);

    return new Response(
      JSON.stringify({ success: true, message: `Approval email sent to ${profile.email}` }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[send-approval-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
