import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_RESETS = 3;
const MAX_ATTEMPTS_PER_CODE = 3;

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

    // === RATE LIMITING: max 3 reset attempts per 15 min ===
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: recentResets } = await supabaseAdmin
      .from('mfa_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'self_reset')
      .gte('created_at', windowStart);

    if ((recentResets ?? 0) >= RATE_LIMIT_MAX_RESETS) {
      console.warn(`[self-reset-mfa] Rate limit exceeded for user ${user.id}`);
      return new Response(JSON.stringify({ 
        error: 'Zbyt wiele prób resetu. Odczekaj 15 minut.',
        success: false,
        rate_limited: true 
      }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record attempt
    await supabaseAdmin.from('mfa_rate_limits').insert({
      user_id: user.id,
      action_type: 'self_reset',
    });

    // Step 1: Verify the email MFA code (with attempt tracking)
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
      // Increment attempts on all active codes
      const { data: activeCodes } = await supabaseAdmin
        .from('mfa_email_codes')
        .select('id, attempts')
        .eq('user_id', user.id)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString());

      if (activeCodes) {
        for (const c of activeCodes) {
          await supabaseAdmin
            .from('mfa_email_codes')
            .update({ 
              attempts: (c.attempts || 0) + 1, 
              used: (c.attempts || 0) + 1 >= MAX_ATTEMPTS_PER_CODE 
            })
            .eq('id', c.id);
        }
      }

      return new Response(JSON.stringify({ error: 'Invalid or expired code', success: false }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark all codes as used
    await supabaseAdmin.from('mfa_email_codes')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('used', false);

    // Step 2: Delete ALL TOTP factors via Admin API
    const { data: factorsData, error: factorsError } = await supabaseAdmin.auth.admin.mfa.listFactors({
      userId: user.id,
    });

    if (factorsError) {
      console.error('[self-reset-mfa] Failed to list factors:', factorsError);
      return new Response(JSON.stringify({ error: 'Failed to list MFA factors', success: false }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log structure for debugging
    console.log('[self-reset-mfa] factorsData keys:', Object.keys(factorsData || {}));
    console.log('[self-reset-mfa] factorsData.totp:', JSON.stringify((factorsData as any)?.totp));
    console.log('[self-reset-mfa] factorsData.factors:', JSON.stringify((factorsData as any)?.factors));

    // Handle both SDK response formats: .totp[] and .factors[]
    const totpFactors = [
      ...(factorsData?.totp ?? []),
      ...((factorsData as any)?.factors?.filter((f: any) => f.factor_type === 'totp') ?? []),
    ];
    const uniqueFactors = Array.from(new Map(totpFactors.map((f: any) => [f.id, f])).values());
    let deletedCount = 0;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (const factor of uniqueFactors) {
      if (!factor.id || !uuidRegex.test(factor.id)) {
        console.error(`[self-reset-mfa] Skipping invalid factor id: ${factor.id}`);
        continue;
      }
      const { error: deleteError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
        userId: user.id,
        factorId: factor.id,
      });
      if (deleteError) {
        console.error(`[self-reset-mfa] Failed to delete factor ${factor.id}:`, deleteError);
      } else {
        deletedCount++;
      }
    }

    console.log(`[self-reset-mfa] Deleted ${deletedCount}/${uniqueFactors.length} TOTP factors for user ${user.id}`);

    // Step 3: Log the action (non-blocking)
    await supabaseAdmin.from('user_activity_log').insert({
      user_id: user.id,
      action_type: 'mfa_self_reset',
      action_details: `User self-reset TOTP via email verification. Deleted ${deletedCount} factor(s).`,
      metadata: {
        deleted_factor_count: deletedCount,
        total_factors_found: totpFactors.length,
        ip: req.headers.get('x-forwarded-for') || 'unknown',
      },
    }).then(() => {}).catch((e: any) => console.error('[self-reset-mfa] Failed to log activity:', e));

    return new Response(JSON.stringify({ 
      success: true, 
      deleted_factors: deletedCount,
      message: 'TOTP factors have been reset. You can now set up a new authenticator.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('self-reset-mfa error:', error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
