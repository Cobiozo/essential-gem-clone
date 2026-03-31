import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ModuleInfo {
  moduleId: string;
  moduleTitle: string;
  progressPercent: number;
  daysInactive: number;
  assignmentId: string;
}

interface GroupedReminderRequest {
  userId: string;
  modules: ModuleInfo[];
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
  const senderDomain = settings.from_email.split('@')[1] || 'localhost';
  console.log(`[SMTP] Sending grouped training reminder to ${to}`);

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

    const sendCommand = async (command: string, hideLog = false): Promise<string> => {
      if (!hideLog) console.log('[SMTP] Sending:', command.trim().substring(0, 200));
      else console.log('[SMTP] Sending: [HIDDEN]');
      await conn!.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    await readResponse();
    await sendCommand(`EHLO ${senderDomain}`);

    if (settings.encryption === 'starttls') {
      await sendCommand('STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(`EHLO ${senderDomain}`);
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(base64EncodeAscii(settings.password), true);
    
    if (!authResponse.startsWith('235')) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    const mailFromResp = await sendCommand(`MAIL FROM:<${settings.from_email}>`);
    if (!mailFromResp.startsWith('250')) throw new Error(`MAIL FROM rejected: ${mailFromResp}`);

    const rcptResp = await sendCommand(`RCPT TO:<${to}>`);
    if (!rcptResp.startsWith('250')) throw new Error(`RCPT TO rejected: ${rcptResp}`);

    const dataResp = await sendCommand('DATA');
    if (!dataResp.startsWith('354')) throw new Error(`DATA rejected: ${dataResp}`);

    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${senderDomain}>`;
    const plainText = htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const emailContent = [
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `From: "${settings.from_name}" <${settings.from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `Reply-To: <${settings.from_email}>`,
      `Return-Path: <${settings.from_email}>`,
      `X-Mailer: PureLife-Platform/1.0`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(plainText),
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      base64Encode(htmlBody),
      ``,
      `--${boundary}--`,
      `.`,
    ].join('\r\n');

    const sendResp = await sendCommand(emailContent);
    if (!sendResp.startsWith('250')) throw new Error(`Failed to send: ${sendResp}`);

    await sendCommand('QUIT');
    conn.close();

    console.log('[SMTP] Grouped training reminder sent successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) {
      try { conn.close(); } catch {}
    }
  }
}

const PURE_LIFE_LOGO = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png';
function wrapWithBranding(html: string): string {
  const c = html.replace(/<!DOCTYPE[^>]*>/gi,'').replace(/<\/?html[^>]*>/gi,'').replace(/<head[\s\S]*?<\/head>/gi,'').replace(/<\/?body[^>]*>/gi,'');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#fff;"><div style="background:linear-gradient(135deg,#D4A843,#B8912A);padding:30px;text-align:center;"><img src="${PURE_LIFE_LOGO}" alt="Pure Life Center" style="max-width:180px;height:auto;"/></div><div style="padding:20px 30px;">${c}</div><div style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#888;"><p style="margin:0;">&copy; ${new Date().getFullYear()} Pure Life Center</p></div></div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, modules }: GroupedReminderRequest = await req.json();
    console.log("[send-training-reminder-grouped] Request:", { userId, moduleCount: modules?.length });

    if (!userId || !modules || modules.length === 0) {
      throw new Error("Missing required parameters: userId, modules");
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

    // Get APP_BASE_URL
    const { data: settingsData } = await supabase
      .from('page_settings')
      .select('app_base_url')
      .limit(1)
      .maybeSingle();
    
    const baseUrl = settingsData?.app_base_url || 'https://purelife.lovable.app';
    const firstName = profile.first_name || 'Użytkowniku';

    const subject = modules.length === 1
      ? `📚 Przypomnienie: moduł „${modules[0].moduleTitle}" czeka na Ciebie`
      : `📚 Przypomnienie: ${modules.length} modułów szkoleniowych czeka na Ciebie`;

    // Build module list HTML
    const moduleListHtml = modules.map(m => {
      const progressBar = `<div style="background:#e0e0e0;border-radius:4px;height:8px;width:100%;margin-top:6px;"><div style="background:linear-gradient(90deg,#D4A843,#B8912A);border-radius:4px;height:8px;width:${m.progressPercent}%;"></div></div>`;
      return `
        <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:#333;font-size:14px;">📖 ${m.moduleTitle}</strong>
          </div>
          <div style="color:#888;font-size:12px;margin-top:4px;">Postęp: ${m.progressPercent}% · Nieaktywność: ${m.daysInactive} dni</div>
          ${progressBar}
          <div style="margin-top:8px;">
            <a href="${baseUrl}/training/${m.moduleId}" style="color:#D4A843;font-size:13px;text-decoration:none;font-weight:bold;">Kontynuuj →</a>
          </div>
        </div>
      `;
    }).join('');

    const htmlBody = `
      <h2 style="color:#333;margin-bottom:15px;">Witaj ${firstName}!</h2>
      <p style="color:#555;line-height:1.6;">
        Zauważyliśmy, że od dłuższego czasu nie realizowałeś/aś swoich modułów szkoleniowych w Akademii Pure Life.
        ${modules.length > 1 ? `Poniżej znajdziesz listę <strong>${modules.length} modułów</strong>, które czekają na kontynuację:` : 'Poniżej znajdziesz moduł, który czeka na kontynuację:'}
      </p>
      <div style="margin:20px 0;">
        ${moduleListHtml}
      </div>
      <div style="text-align:center;margin:25px 0;">
        <a href="${baseUrl}/training" style="background:linear-gradient(135deg,#D4A843,#B8912A);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
          Przejdź do Akademii
        </a>
      </div>
      <p style="color:#888;font-size:13px;margin-top:20px;">
        Ta wiadomość została wysłana automatycznie przez system Pure Life Center.
      </p>
    `;

    // Send email
    const result = await sendSmtpEmail(smtpSettings, profile.email, subject, wrapWithBranding(htmlBody));

    // Log the email
    await supabase.from("email_logs").insert({
      recipient_email: profile.email,
      recipient_user_id: userId,
      subject: subject,
      status: result.success ? "sent" : "error",
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
      metadata: { 
        event: 'training_reminder_grouped',
        module_count: modules.length,
        module_ids: modules.map(m => m.moduleId),
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    // Update reminder tracking for all assignments
    for (const m of modules) {
      const { data: currentAssignment } = await supabase
        .from("training_assignments")
        .select("reminder_count")
        .eq("id", m.assignmentId)
        .single();

      const newReminderCount = (currentAssignment?.reminder_count || 0) + 1;

      await supabase
        .from("training_assignments")
        .update({
          reminder_count: newReminderCount,
          last_reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", m.assignmentId);
    }

    console.log("[send-training-reminder-grouped] Email sent successfully to:", profile.email, "for", modules.length, "modules");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Grouped training reminder sent to ${profile.email} for ${modules.length} modules`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-training-reminder-grouped] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
