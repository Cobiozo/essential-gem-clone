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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min TTL

    // Invalidate old unused codes
    await supabaseAdmin.from('mfa_email_codes').update({ used: true })
      .eq('user_id', user.id).eq('used', false);

    // Insert new code
    await supabaseAdmin.from('mfa_email_codes').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt,
    });

    // Get SMTP settings
    const { data: smtpSettings } = await supabaseAdmin
      .from('smtp_settings').select('*').limit(1).single();

    if (!smtpSettings) {
      return new Response(JSON.stringify({ error: 'SMTP not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user email from profile
    const userEmail = user.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'No email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email via SMTP
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a2e; text-align: center;">Kod weryfikacyjny MFA</h2>
        <p style="color: #555; text-align: center;">Twój jednorazowy kod weryfikacyjny:</p>
        <div style="background: #f0f4f8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
        </div>
        <p style="color: #888; text-align: center; font-size: 13px;">
          Kod jest ważny przez 5 minut. Nie udostępniaj go nikomu.
        </p>
      </div>
    `;

    const smtpHost = smtpSettings.host;
    const smtpPort = smtpSettings.port || 587;
    const smtpUser = smtpSettings.username;
    const smtpPass = smtpSettings.password;
    const fromEmail = smtpSettings.from_email || smtpUser;
    const fromName = smtpSettings.from_name || 'System';

    // Use fetch to send via SMTP relay or fallback
    // For simplicity, use Supabase's built-in email or a simple SMTP POST
    // We'll use a basic SMTP approach via the existing send-single-email pattern
    const { error: sendError } = await supabaseAdmin.functions.invoke('send-single-email', {
      body: {
        to: userEmail,
        subject: `Kod MFA: ${code}`,
        html: emailHtml,
        from_name: fromName,
      },
    });

    if (sendError) {
      console.error('Failed to send MFA email:', sendError);
      // Still return success - code is saved, user can retry
    }

    return new Response(JSON.stringify({ success: true, email: userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3') }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-mfa-code error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
