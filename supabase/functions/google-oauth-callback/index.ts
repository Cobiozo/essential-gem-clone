import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains user_id and redirect_url
    const error = url.searchParams.get('error');

    console.log('[google-oauth-callback] Processing callback...');

    if (error) {
      console.error('[google-oauth-callback] OAuth error:', error);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${Deno.env.get('SITE_URL') || 'https://purelife.lovable.app'}/my-account?google_error=${error}`,
        },
      });
    }

    if (!code || !state) {
      console.error('[google-oauth-callback] Missing code or state');
      return new Response(JSON.stringify({ error: 'Missing code or state' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse state to get user_id and redirect URL
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      console.error('[google-oauth-callback] Invalid state format');
      return new Response(JSON.stringify({ error: 'Invalid state' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, redirect_url } = stateData;

    if (!user_id) {
      console.error('[google-oauth-callback] Missing user_id in state');
      return new Response(JSON.stringify({ error: 'Missing user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange authorization code for tokens
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[google-oauth-callback] Missing Google OAuth credentials');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${redirect_url || Deno.env.get('SITE_URL') || 'https://purelife.lovable.app'}/my-account?google_error=missing_credentials`,
        },
      });
    }

    // Build redirect URI - must match exactly what was used in authorization
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    console.log('[google-oauth-callback] Exchanging code for tokens...');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[google-oauth-callback] Token exchange failed:', errorData);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${redirect_url || Deno.env.get('SITE_URL') || 'https://purelife.lovable.app'}/my-account?google_error=token_exchange_failed`,
        },
      });
    }

    const tokens = await tokenResponse.json();
    console.log('[google-oauth-callback] Tokens received successfully');

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Save tokens to database using service role
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Upsert tokens (update if exists, insert if not)
    const { error: upsertError } = await supabaseAdmin
      .from('user_google_tokens')
      .upsert({
        user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        calendar_id: 'primary',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('[google-oauth-callback] Failed to save tokens:', upsertError);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${redirect_url || Deno.env.get('SITE_URL') || 'https://purelife.lovable.app'}/my-account?google_error=save_failed`,
        },
      });
    }

    console.log('[google-oauth-callback] Tokens saved successfully for user:', user_id);

    // Redirect back to app with success
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${redirect_url || Deno.env.get('SITE_URL') || 'https://purelife.lovable.app'}/my-account?google_connected=true`,
      },
    });

  } catch (error) {
    console.error('[google-oauth-callback] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
