import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption_type: string;
}

// Base64 encoding utilities
function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64EncodeAscii(str: string): string {
  return btoa(str);
}

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Send email via raw SMTP
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  console.log(`[SMTP] Connecting to ${settings.host}:${settings.port} (${settings.encryption_type})`);

  let conn: Deno.TcpConn | Deno.TlsConn;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readLine = async (connection: Deno.TcpConn | Deno.TlsConn): Promise<string> => {
    const buffer = new Uint8Array(1024);
    let result = '';
    while (true) {
      const n = await withTimeout(connection.read(buffer), 15000);
      if (n === null) break;
      result += decoder.decode(buffer.subarray(0, n));
      if (result.includes('\r\n')) break;
    }
    console.log(`[SMTP] <<< ${result.trim()}`);
    return result;
  };

  const sendCommand = async (connection: Deno.TcpConn | Deno.TlsConn, command: string, hideLog = false): Promise<string> => {
    if (!hideLog) {
      console.log(`[SMTP] >>> ${command.startsWith('AUTH') ? 'AUTH [hidden]' : command}`);
    }
    await connection.write(encoder.encode(command + '\r\n'));
    return await readLine(connection);
  };

  try {
    // Connect based on encryption type
    if (settings.encryption_type === 'ssl') {
      conn = await withTimeout(
        Deno.connectTls({ hostname: settings.host, port: settings.port }),
        20000
      );
    } else {
      conn = await withTimeout(
        Deno.connect({ hostname: settings.host, port: settings.port }),
        20000
      );
    }

    // Read greeting
    await readLine(conn);

    // EHLO
    await sendCommand(conn, `EHLO localhost`);

    // STARTTLS if needed
    if (settings.encryption_type === 'starttls') {
      await sendCommand(conn, 'STARTTLS');
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.host });
      await sendCommand(conn, `EHLO localhost`);
    }

    // AUTH LOGIN
    await sendCommand(conn, 'AUTH LOGIN');
    await sendCommand(conn, base64EncodeAscii(settings.username), true);
    const authResponse = await sendCommand(conn, base64EncodeAscii(settings.password), true);
    
    if (!authResponse.startsWith('235')) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }

    // MAIL FROM
    await sendCommand(conn, `MAIL FROM:<${settings.from_email}>`);

    // RCPT TO
    await sendCommand(conn, `RCPT TO:<${to}>`);

    // DATA
    await sendCommand(conn, 'DATA');

    // Email content
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const emailContent = [
      `From: ${settings.from_name} <${settings.from_email}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
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

    await sendCommand(conn, emailContent);

    // QUIT
    await sendCommand(conn, 'QUIT');

    conn.close();
    console.log('[SMTP] Email sent successfully');
  } catch (error) {
    console.error('[SMTP] Error:', error);
    throw error;
  } finally {
    if (conn) {
      try { conn.close(); } catch (closeError) {
        console.warn('[SMTP] Error closing connection:', closeError);
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[Auth] User error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("[Auth] User ID:", userId);

    // Create service role client for admin checks
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("[Auth] Not admin:", roleError || roleData);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { origin } = await req.json();
    console.log("[Request] Origin:", origin);

    // Get admin's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.email) {
      console.error("[Profile] Error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Profile] Sending to:", profile.email);

    // Get bypass key from maintenance_mode
    const { data: maintenance, error: maintenanceError } = await supabaseAdmin
      .from("maintenance_mode")
      .select("bypass_key")
      .single();

    if (maintenanceError || !maintenance?.bypass_key) {
      console.error("[Maintenance] Error:", maintenanceError);
      return new Response(
        JSON.stringify({ error: "Bypass key not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bypassLink = `${origin}/auth?admin=${maintenance.bypass_key}`;
    console.log("[Email] Bypass link generated");

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabaseAdmin
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (smtpError || !smtpSettings) {
      console.error("[SMTP] Settings error:", smtpError);
      return new Response(
        JSON.stringify({ error: "SMTP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email HTML
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .link-box { background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .link { color: #2563eb; font-size: 14px; word-break: break-all; }
    .button { display: inline-block; background: #2563eb; color: white !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔧 Tryb serwisowy aktywowany</h1>
    </div>
    <div class="content">
      <p>Witaj <strong>${profile.first_name || "Administratorze"}</strong>,</p>
      <p>Tryb serwisowy został włączony. Strona logowania jest teraz zablokowana dla wszystkich użytkowników.</p>
      
      <div class="link-box">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Twój link dostępu:</p>
        <a href="${bypassLink}" class="link">${bypassLink}</a>
        <br>
        <a href="${bypassLink}" class="button">Przejdź do logowania</a>
      </div>
      
      <div class="warning">
        <strong>⚠️ Ważne:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Ten link jest poufny - nie udostępniaj go osobom trzecim</li>
          <li>Link działa tylko gdy tryb serwisowy jest aktywny</li>
          <li>Pamiętaj, aby wyłączyć tryb serwisowy po zakończeniu prac</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>Wiadomość wygenerowana automatycznie przez system Pure Life</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email - map database column names to SmtpSettings interface
    await sendSmtpEmail(
      {
        host: smtpSettings.smtp_host,
        port: smtpSettings.smtp_port,
        username: smtpSettings.smtp_username,
        password: smtpSettings.smtp_password,
        from_email: smtpSettings.sender_email,
        from_name: smtpSettings.sender_name || "Pure Life System",
        encryption_type: smtpSettings.smtp_encryption || "starttls",
      },
      profile.email,
      "🔧 Tryb serwisowy - Twój link dostępu",
      htmlBody
    );

    // Log the email
    await supabaseAdmin.from("email_logs").insert({
      recipient_email: profile.email,
      recipient_user_id: userId,
      subject: "Tryb serwisowy - link dostępu",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { type: "maintenance_bypass" },
    });

    console.log("[Success] Email sent to:", profile.email);

    return new Response(
      JSON.stringify({ success: true, email: profile.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
