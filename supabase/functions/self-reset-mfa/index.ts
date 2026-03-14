import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Step 1: Verify the email MFA code
    const { data: codeRecord, error: codeError } = await supabaseAdmin
      .from('mfa_email_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeRecord) {
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

    const totpFactors = (factorsData?.factors || []).filter((f: any) => f.factor_type === 'totp');
    let deletedCount = 0;

    for (const factor of totpFactors) {
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

    console.log(`[self-reset-mfa] Deleted ${deletedCount}/${totpFactors.length} TOTP factors for user ${user.id}`);

    // Step 3: Log the action
    await supabaseAdmin.from('user_activity_log').insert({
      user_id: user.id,
      activity_type: 'mfa_self_reset',
      description: `User self-reset TOTP via email verification. Deleted ${deletedCount} factor(s).`,
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
