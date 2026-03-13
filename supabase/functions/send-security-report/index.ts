import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Build HTML report
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

    // Send via existing send-single-email
    const { error: sendError } = await supabaseAdmin.functions.invoke('send-single-email', {
      body: {
        to: targetEmail,
        subject: `🔒 Raport Bezpieczeństwa — ${reportDate}`,
        html,
        from_name: 'System Bezpieczeństwa',
      },
    });

    if (sendError) {
      console.error('Failed to send report:', sendError);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
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
