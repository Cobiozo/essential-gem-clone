import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  console.log(`[SMTP] Sending security report to ${to}`);
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
    if (!authResponse.startsWith('235')) throw new Error(`Auth failed: ${authResponse}`);

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
    if (!sendResp.startsWith('250')) throw new Error(`Send failed: ${sendResp}`);

    await sendCommand('QUIT');
    conn.close();
    return { success: true };
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    if (conn) { try { conn.close(); } catch {} }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if reports are enabled
    const { data: settings } = await supabaseAdmin
      .from('security_settings').select('setting_key, setting_value');

    const getVal = (key: string) => settings?.find(s => s.setting_key === key)?.setting_value;
    const reportEnabled = getVal('report_enabled') === true;
    const reportEmail = typeof getVal('report_email') === 'string' ? getVal('report_email') : '';

    // Allow manual trigger from request body
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetEmail = body.email || reportEmail;
    const isManual = !!body.email;

    if (!isManual && !reportEnabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Reports disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!targetEmail) {
      return new Response(JSON.stringify({ error: 'No report email configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get SMTP settings
    const { data: smtpData } = await supabaseAdmin
      .from('smtp_settings').select('*').eq('is_active', true).limit(1).single();

    if (!smtpData) {
      return new Response(JSON.stringify({ error: 'SMTP not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const smtpSettings: SmtpSettings = {
      host: smtpData.smtp_host,
      port: smtpData.smtp_port || 587,
      encryption: smtpData.smtp_encryption || 'starttls',
      username: smtpData.smtp_username,
      password: smtpData.smtp_password,
      from_email: smtpData.sender_email,
      from_name: smtpData.sender_name || 'System Bezpieczeństwa',
    };

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Gather stats
    const [logins24h, logins7d, logins30d, suspicious24h, unresolvedAlerts] = await Promise.all([
      supabaseAdmin.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last24h),
      supabaseAdmin.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last7d),
      supabaseAdmin.from('login_audit_log').select('id', { count: 'exact', head: true }).gte('login_at', last30d),
      supabaseAdmin.from('login_audit_log').select('id', { count: 'exact', head: true }).eq('is_suspicious', true).gte('login_at', last24h),
      supabaseAdmin.from('security_alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
    ]);

    // Top cities (7d)
    const { data: cityData } = await supabaseAdmin
      .from('login_audit_log').select('city').gte('login_at', last7d).not('city', 'is', null);

    const cityCounts: Record<string, number> = {};
    cityData?.forEach(r => { 
      const c = r.city || 'Nieznane';
      cityCounts[c] = (cityCounts[c] || 0) + 1; 
    });
    const topCities = Object.entries(cityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    // Recent alerts
    const { data: recentAlerts } = await supabaseAdmin
      .from('security_alerts')
      .select('alert_type, severity, created_at, is_resolved')
      .order('created_at', { ascending: false })
      .limit(10);

    const reportDate = now.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff; padding: 32px;">
      <h1 style="color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
        🔒 Raport Bezpieczeństwa
      </h1>
      <p style="color: #888; font-size: 13px;">Wygenerowano: ${reportDate}</p>
      
      <h2 style="color: #1a1a2e; margin-top: 24px;">📊 Statystyki logowań</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background: #f7fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Okres</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Logowania</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">Ostatnie 24h</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">${logins24h.count || 0}</td>
        </tr>
        <tr style="background: #f7fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0;">Ostatnie 7 dni</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">${logins7d.count || 0}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">Ostatnie 30 dni</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">${logins30d.count || 0}</td>
        </tr>
      </table>

      <h2 style="color: #1a1a2e;">⚠️ Anomalie</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background: #f7fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Metryka</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Wartość</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">Podejrzane logowania (24h)</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; color: ${(suspicious24h.count || 0) > 0 ? '#e53e3e' : '#38a169'};">${suspicious24h.count || 0}</td>
        </tr>
        <tr style="background: #f7fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0;">Nierozwiązane alerty</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; color: ${(unresolvedAlerts.count || 0) > 0 ? '#e53e3e' : '#38a169'};">${unresolvedAlerts.count || 0}</td>
        </tr>
      </table>

      <h2 style="color: #1a1a2e;">🌍 Top 10 miast (7 dni)</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background: #f7fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Miasto</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Logowania</td>
        </tr>
        ${topCities.map(([city, count], i) => `
          <tr${i % 2 === 1 ? ' style="background: #f7fafc;"' : ''}>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">${city}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">${count}</td>
          </tr>
        `).join('')}
        ${topCities.length === 0 ? '<tr><td colspan="2" style="padding: 12px; border: 1px solid #e2e8f0; color: #888;">Brak danych</td></tr>' : ''}
      </table>

      ${recentAlerts && recentAlerts.length > 0 ? `
        <h2 style="color: #1a1a2e;">🚨 Ostatnie alerty</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f7fafc;">
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Typ</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Ważność</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Data</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Status</td>
          </tr>
          ${recentAlerts.map((a, i) => `
            <tr${i % 2 === 1 ? ' style="background: #f7fafc;"' : ''}>
              <td style="padding: 12px; border: 1px solid #e2e8f0;">${a.alert_type}</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0; color: ${a.severity === 'high' ? '#e53e3e' : '#dd6b20'};">${a.severity}</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0;">${new Date(a.created_at).toLocaleString('pl-PL')}</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0;">${a.is_resolved ? '✅ Rozwiązany' : '⏳ Aktywny'}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #888; font-size: 12px; text-align: center;">
        Raport wygenerowany automatycznie przez Moduł Bezpieczeństwa.
      </p>
    </div>`;

    // Send via direct SMTP
    const result = await sendSmtpEmail(smtpSettings, targetEmail, `🔒 Raport Bezpieczeństwa — ${reportDate}`, html);

    if (!result.success) {
      console.error('Failed to send report:', result.error);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: result.error }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent_to: targetEmail,
      stats: {
        logins_24h: logins24h.count || 0,
        logins_7d: logins7d.count || 0,
        logins_30d: logins30d.count || 0,
        suspicious_24h: suspicious24h.count || 0,
        unresolved_alerts: unresolvedAlerts.count || 0,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-security-report error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
