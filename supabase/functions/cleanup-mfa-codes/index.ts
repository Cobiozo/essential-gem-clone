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

    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Delete expired/used MFA email codes older than 24h
    const { count: deletedCodes } = await supabaseAdmin
      .from('mfa_email_codes')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff24h);

    // Delete old rate limit entries older than 24h
    const { count: deletedRateLimits } = await supabaseAdmin
      .from('mfa_rate_limits')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff24h);

    console.log(`[cleanup-mfa-codes] Deleted ${deletedCodes ?? 0} old codes and ${deletedRateLimits ?? 0} rate limit entries`);

    return new Response(JSON.stringify({ 
      success: true, 
      deleted_codes: deletedCodes ?? 0,
      deleted_rate_limits: deletedRateLimits ?? 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('cleanup-mfa-codes error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
