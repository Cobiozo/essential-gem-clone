import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    if (!GOOGLE_CLIENT_ID) {
      return new Response(JSON.stringify({ 
        configured: false, 
        error: 'Google OAuth not configured' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build redirect URI
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    return new Response(JSON.stringify({
      configured: true,
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[google-oauth-config] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
