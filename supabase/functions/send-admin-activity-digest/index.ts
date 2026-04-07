import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
}

function base64EncodeAscii(str: string): string {
  return btoa(str);
}

function base64EncodeUtf8(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  const senderDomain = settings.sender_email.split('@')[1] || 'localhost';
  try {
    let conn: Deno.TcpConn | Deno.TlsConn;
    if (settings.smtp_port === 465) {
      conn = await Deno.connectTls({ hostname: settings.smtp_host, port: 465 });
    } else {
      conn = await Deno.connect({ hostname: settings.smtp_host, port: settings.smtp_port });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const buf = new Uint8Array(4096);

    async function read(): Promise<string> {
      const n = await conn.read(buf);
      return n ? decoder.decode(buf.subarray(0, n)) : '';
    }

    async function write(cmd: string) {
      await conn.write(encoder.encode(cmd + '\r\n'));
    }

    await read();
    await write(`EHLO ${senderDomain}`);
    await read();

    if (settings.smtp_port === 587) {
      await write('STARTTLS');
      await read();
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: settings.smtp_host });
      await write(`EHLO ${senderDomain}`);
      await read();
    }

    await write('AUTH LOGIN');
    await read();
    await write(base64EncodeAscii(settings.smtp_username));
    await read();
    await write(base64EncodeAscii(settings.smtp_password));
    const authResp = await read();
    if (!authResp.startsWith('235')) {
      conn.close();
      return { success: false, error: 'SMTP auth failed' };
    }

    await write(`MAIL FROM:<${settings.sender_email}>`);
    await read();
    await write(`RCPT TO:<${to}>`);
    await read();
    await write('DATA');
    await read();

    const boundary = `boundary_${Date.now()}`;
    const encodedSubject = `=?UTF-8?B?${base64EncodeUtf8(subject)}?=`;
    const encodedFrom = `=?UTF-8?B?${base64EncodeUtf8(settings.sender_name)}?= <${settings.sender_email}>`;

    const message = [
      `From: ${encodedFrom}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${senderDomain}>`,
      `Date: ${new Date().toUTCString()}`,
      '',
      base64EncodeUtf8(htmlBody),
      '.',
    ].join('\r\n');

    await conn.write(encoder.encode(message + '\r\n'));
    await read();
    await write('QUIT');
    try { conn.close(); } catch {}
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get activity from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs, error: logsError } = await supabase
      .from('admin_activity_log')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (logsError) throw logsError;
    if (!logs || logs.length === 0) {
      return new Response(JSON.stringify({ message: 'No activity in last 24h' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get admin profiles
    const adminIds = [...new Set(logs.map(l => l.admin_user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email')
      .in('user_id', adminIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => { profileMap[p.user_id] = p; });

    // Get admin emails to send to
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminUserIds = adminRoles?.map(r => r.user_id) || [];
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email')
      .in('user_id', adminUserIds)
      .not('email', 'is', null);

    const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];
    if (adminEmails.length === 0) {
      return new Response(JSON.stringify({ message: 'No admin emails found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SMTP settings
    const smtpSettings: SmtpSettings = {
      smtp_host: Deno.env.get('SMTP_HOST') || '',
      smtp_port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
      smtp_username: Deno.env.get('SMTP_USERNAME') || '',
      smtp_password: Deno.env.get('SMTP_PASSWORD') || '',
      sender_email: 'no-reply@purelife.info.pl',
      sender_name: 'Pure Life Center',
    };

    // Build HTML
    const formatDate = (d: string) => new Date(d).toLocaleString('pl-PL', {
      timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const getAdminName = (id: string) => {
      const p = profileMap[id];
      return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : id.slice(0, 8);
    };

    // Group by admin
    const byAdmin: Record<string, typeof logs> = {};
    logs.forEach(l => {
      if (!byAdmin[l.admin_user_id]) byAdmin[l.admin_user_id] = [];
      byAdmin[l.admin_user_id].push(l);
    });

    let tableRows = '';
    for (const [adminId, adminLogs] of Object.entries(byAdmin)) {
      tableRows += `<tr><td colspan="4" style="background:#f5f5f5;padding:8px 12px;font-weight:bold;border-bottom:1px solid #e0e0e0;">
        👤 ${getAdminName(adminId)} (${adminLogs.length} akcji)
      </td></tr>`;
      for (const log of adminLogs) {
        tableRows += `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;color:#666;">${formatDate(log.created_at)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;">${log.action_type}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;">${log.action_description}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;color:#999;">${log.target_table || '—'}</td>
        </tr>`;
      }
    }

    const reportDate = new Date().toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#fff;color:#333;">
      <div style="max-width:800px;margin:0 auto;padding:20px;">
        <h1 style="color:#C5A059;font-size:20px;">📋 Dziennik działań administratorów</h1>
        <p style="color:#666;font-size:14px;">Raport za okres: ${reportDate} (ostatnie 24h) · Łącznie: ${logs.length} akcji</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead><tr style="background:#333;color:#fff;">
            <th style="padding:8px 12px;text-align:left;font-size:13px;">Data</th>
            <th style="padding:8px 12px;text-align:left;font-size:13px;">Typ</th>
            <th style="padding:8px 12px;text-align:left;font-size:13px;">Opis</th>
            <th style="padding:8px 12px;text-align:left;font-size:13px;">Tabela</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#999;">Wiadomość wygenerowana automatycznie przez Pure Life Center.</p>
      </div>
    </body></html>`;

    const subject = `📋 Dziennik admina — ${reportDate} (${logs.length} akcji)`;

    // Send to each admin
    let sentCount = 0;
    for (const email of adminEmails) {
      const result = await sendSmtpEmail(smtpSettings, email, subject, html);
      if (result.success) sentCount++;
      else console.warn(`Failed to send digest to ${email}: ${result.error}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Digest sent to ${sentCount}/${adminEmails.length} admins`,
      logCount: logs.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-admin-activity-digest] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
