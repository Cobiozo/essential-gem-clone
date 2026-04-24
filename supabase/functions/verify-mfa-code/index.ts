import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_ATTEMPTS_PER_CODE = 3;
const RATE_LIMIT_WINDOW_MINUTES = 2;
const RATE_LIMIT_MAX_VERIFICATIONS = 5;

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

    const { code } = await req.json();
    if (!code || code.length !== 6) {
      return new Response(JSON.stringify({ error: 'Invalid code format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === RATE LIMITING: max 10 verification attempts per 5 min ===
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabaseAdmin
      .from('mfa_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'verify_code')
      .gte('created_at', windowStart);

    if ((recentAttempts ?? 0) >= RATE_LIMIT_MAX_VERIFICATIONS) {
      console.warn(`[MFA] Verify rate limit exceeded for user ${user.id}`);
      return new Response(JSON.stringify({ 
        error: 'Zbyt wiele prób weryfikacji. Odczekaj 5 minut.',
        valid: false,
        rate_limited: true 
      }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record attempt
    await supabaseAdmin.from('mfa_rate_limits').insert({
      user_id: user.id,
      action_type: 'verify_code',
    });

    // Find any valid, unexpired code matching the input
    const { data: codeRecord, error: codeError } = await supabaseAdmin
      .from('mfa_email_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .lt('attempts', MAX_ATTEMPTS_PER_CODE)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeRecord) {
      // Increment attempts on all active codes for this user (wrong code = attempt on all)
      try {
        await supabaseAdmin.rpc('increment_mfa_code_attempts', { p_user_id: user.id });
      } catch {
        // Fallback: increment via direct update
        try {
          const { data: codes } = await supabaseAdmin
            .from('mfa_email_codes')
            .select('id, attempts')
            .eq('user_id', user.id)
            .eq('used', false)
            .gte('expires_at', new Date().toISOString());
          if (codes) {
            for (const c of codes) {
              await supabaseAdmin
                .from('mfa_email_codes')
                .update({ attempts: (c.attempts || 0) + 1, used: (c.attempts || 0) + 1 >= MAX_ATTEMPTS_PER_CODE })
                .eq('id', c.id);
            }
          }
        } catch {}
      }

      return new Response(JSON.stringify({ error: 'Invalid or expired code', valid: false }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as used + invalidate all other codes for this user
    await supabaseAdmin.from('mfa_email_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('verify-mfa-code error:', error);
    return new Response(JSON.stringify({ error: error.message, valid: false }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
