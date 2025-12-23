import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMessageRequest {
  specialist_id: string;
  subject: string;
  message: string;
  attachments?: Array<{ name: string; url: string }>;
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
  htmlBody: string,
  replyTo?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[SMTP] Sending specialist message to ${to}`);
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

    const headers = [
      `From: ${settings.from_name} <${settings.from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ];
    
    if (replyTo) {
      headers.push(`Reply-To: ${replyTo}`);
    }

    const emailContent = [
      ...headers,
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

    console.log('[SMTP] Specialist message sent successfully');
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { specialist_id, subject, message, attachments }: SendMessageRequest = await req.json();
    console.log("[send-specialist-message] Request:", { specialist_id, subject, user_id: user.id });

    // Check if specialist exists and is searchable
    const { data: specialist, error: specialistError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name, specialization, is_searchable")
      .eq("user_id", specialist_id)
      .maybeSingle();

    if (specialistError || !specialist) {
      return new Response(JSON.stringify({ error: "Specialist not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if specialist messaging is blocked
    const { data: block } = await supabase
      .from("specialist_messaging_blocks")
      .select("id")
      .eq("specialist_id", specialist_id)
      .maybeSingle();

    if (block) {
      return new Response(JSON.stringify({ error: "Messaging to this specialist is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get messaging settings
    const { data: settings } = await supabase
      .from("specialist_search_settings")
      .select("allow_messaging, max_messages_per_day, max_messages_per_specialist_per_day")
      .limit(1)
      .maybeSingle();

    if (!settings?.allow_messaging) {
      return new Response(JSON.stringify({ error: "Messaging is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check rate limits
    const today = new Date().toISOString().split("T")[0];
    
    const { data: totalToday } = await supabase
      .from("specialist_message_limits")
      .select("message_count")
      .eq("user_id", user.id)
      .eq("window_date", today);

    const totalCount = totalToday?.reduce((sum, r) => sum + (r.message_count || 0), 0) || 0;
    
    if (totalCount >= (settings.max_messages_per_day || 5)) {
      return new Response(JSON.stringify({ 
        error: `Daily message limit reached (${settings.max_messages_per_day} per day)` 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: limitRecord } = await supabase
      .from("specialist_message_limits")
      .select("id, message_count")
      .eq("user_id", user.id)
      .eq("specialist_id", specialist_id)
      .eq("window_date", today)
      .maybeSingle();

    if (limitRecord && limitRecord.message_count >= (settings.max_messages_per_specialist_per_day || 2)) {
      return new Response(JSON.stringify({ 
        error: `Limit per specialist reached (${settings.max_messages_per_specialist_per_day} per day)` 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    const senderName = senderProfile 
      ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() || senderProfile.email
      : user.email;
    const senderEmail = senderProfile?.email || user.email;

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

    // Get email template
    const { data: templateData, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("internal_name", "specialist_message")
      .eq("is_active", true)
      .single();

    if (templateError || !templateData) {
      throw new Error("Email template 'specialist_message' not found");
    }

    // Build attachments HTML
    let attachmentsHtml = '';
    if (attachments && attachments.length > 0) {
      attachmentsHtml = `
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        <p><strong>Załączniki:</strong></p>
        <ul>
          ${attachments.map(a => `<li><a href="${a.url}">${a.name}</a></li>`).join('')}
        </ul>
      `;
    }

    // Build variables
    const variables: Record<string, string> = {
      sender_name: senderName || '',
      sender_email: senderEmail || '',
      subject: subject || '',
      message: message || '',
      attachments_html: attachmentsHtml,
    };

    // Replace variables in template
    const emailSubject = replaceVariables(templateData.subject, variables);
    let htmlBody = replaceVariables(templateData.body_html, variables);
    if (templateData.footer_html) {
      htmlBody += replaceVariables(templateData.footer_html, variables);
    }

    // Send email via SMTP
    const result = await sendSmtpEmail(
      smtpSettings, 
      specialist.email, 
      emailSubject, 
      htmlBody,
      senderEmail
    );

    // Log the email
    await supabase.from("email_logs").insert({
      template_id: templateData.id,
      recipient_email: specialist.email,
      recipient_user_id: specialist_id,
      subject: emailSubject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        sender_id: user.id,
        event: 'specialist_message'
      },
    });

    // Save correspondence record
    const { data: correspondence, error: saveError } = await supabase
      .from("specialist_correspondence")
      .insert({
        sender_id: user.id,
        specialist_id: specialist_id,
        subject: subject,
        message: message,
        attachments: attachments || [],
        status: "sent",
        email_sent: result.success,
        email_sent_at: result.success ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving correspondence:", saveError);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update rate limit
    if (limitRecord) {
      await supabase
        .from("specialist_message_limits")
        .update({ message_count: limitRecord.message_count + 1 })
        .eq("id", limitRecord.id);
    } else {
      await supabase
        .from("specialist_message_limits")
        .insert({
          user_id: user.id,
          specialist_id: specialist_id,
          message_count: 1,
          window_date: today,
        });
    }

    console.log("[send-specialist-message] Message saved:", correspondence.id);

    return new Response(JSON.stringify({ 
      success: true, 
      correspondence_id: correspondence.id,
      email_sent: result.success,
      email_error: result.error
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[send-specialist-message] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
