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
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    console.log('[google-oauth-config] Checking configuration...');
    console.log('[google-oauth-config] GOOGLE_CLIENT_ID set:', !!GOOGLE_CLIENT_ID);
    console.log('[google-oauth-config] GOOGLE_CLIENT_SECRET set:', !!GOOGLE_CLIENT_SECRET);
    console.log('[google-oauth-config] SUPABASE_URL:', SUPABASE_URL);

    if (!GOOGLE_CLIENT_ID) {
      console.error('[google-oauth-config] Missing GOOGLE_CLIENT_ID');
      return new Response(JSON.stringify({ 
        configured: false, 
        error: 'missing_client_id',
        message: 'GOOGLE_CLIENT_ID is not configured in Supabase secrets'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!GOOGLE_CLIENT_SECRET) {
      console.error('[google-oauth-config] Missing GOOGLE_CLIENT_SECRET');
      return new Response(JSON.stringify({ 
        configured: false, 
        error: 'missing_client_secret',
        message: 'GOOGLE_CLIENT_SECRET is not configured in Supabase secrets'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build redirect URI
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
    console.log('[google-oauth-config] Redirect URI:', redirectUri);
    console.log('[google-oauth-config] Client ID prefix:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');

    return new Response(JSON.stringify({
      configured: true,
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      // calendar.events for creating/updating events, calendar.readonly for FreeBusy API (checking busy times)
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[google-oauth-config] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'internal_error',
      message: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
