import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to build redirect URL with error
function buildErrorRedirect(baseUrl: string, errorCode: string, errorDescription?: string): string {
  const url = new URL(`${baseUrl}/my-account`);
  url.searchParams.set('google_error', errorCode);
  if (errorDescription) {
    url.searchParams.set('google_error_desc', errorDescription);
  }
  return url.toString();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const defaultRedirectBase = Deno.env.get('SITE_URL') || 'https://purelife.info.pl';

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('[google-oauth-callback] ========== OAuth Callback Started ==========');
    console.log('[google-oauth-callback] Request URL:', req.url);
    console.log('[google-oauth-callback] Has code:', !!code);
    console.log('[google-oauth-callback] Has state:', !!state);
    console.log('[google-oauth-callback] Error:', error || 'none');
    console.log('[google-oauth-callback] Error description:', errorDescription || 'none');

    // Handle OAuth errors from Google
    if (error) {
      console.error('[google-oauth-callback] Google OAuth error:', error, errorDescription);
      
      // Map common Google OAuth errors to user-friendly codes
      let errorCode = error;
      if (error === 'access_denied') {
        console.log('[google-oauth-callback] User denied access or is not a test user');
        errorCode = 'access_denied';
      }
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(defaultRedirectBase, errorCode, errorDescription || undefined),
        },
      });
    }

    // Validate required parameters
    if (!code) {
      console.error('[google-oauth-callback] Missing authorization code');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(defaultRedirectBase, 'missing_code', 'Authorization code not received'),
        },
      });
    }

    if (!state) {
      console.error('[google-oauth-callback] Missing state parameter');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(defaultRedirectBase, 'missing_state', 'State parameter not received'),
        },
      });
    }

    // Parse state to get user_id and redirect URL
    let stateData;
    let redirectBase = defaultRedirectBase;
    
    try {
      stateData = JSON.parse(atob(state));
      console.log('[google-oauth-callback] State decoded successfully');
      console.log('[google-oauth-callback] User ID:', stateData.user_id);
      console.log('[google-oauth-callback] Redirect URL:', stateData.redirect_url);
      
      if (stateData.redirect_url) {
        redirectBase = stateData.redirect_url;
      }
    } catch (e) {
      console.error('[google-oauth-callback] Failed to parse state:', e);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(defaultRedirectBase, 'invalid_state', 'Could not parse state parameter'),
        },
      });
    }

    const { user_id } = stateData;

    if (!user_id) {
      console.error('[google-oauth-callback] Missing user_id in state');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(redirectBase, 'missing_user_id', 'User ID not found in state'),
        },
      });
    }

    // Validate Google OAuth credentials
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    console.log('[google-oauth-callback] Checking credentials...');
    console.log('[google-oauth-callback] GOOGLE_CLIENT_ID set:', !!GOOGLE_CLIENT_ID);
    console.log('[google-oauth-callback] GOOGLE_CLIENT_SECRET set:', !!GOOGLE_CLIENT_SECRET);

    if (!GOOGLE_CLIENT_ID) {
      console.error('[google-oauth-callback] Missing GOOGLE_CLIENT_ID in Supabase secrets');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(redirectBase, 'missing_client_id', 'Server configuration error: missing client ID'),
        },
      });
    }

    if (!GOOGLE_CLIENT_SECRET) {
      console.error('[google-oauth-callback] Missing GOOGLE_CLIENT_SECRET in Supabase secrets');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(redirectBase, 'missing_client_secret', 'Server configuration error: missing client secret'),
        },
      });
    }

    // Build redirect URI - must match exactly what was used in authorization
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
    console.log('[google-oauth-callback] Token exchange redirect URI:', redirectUri);

    // Exchange authorization code for tokens
    console.log('[google-oauth-callback] Exchanging authorization code for tokens...');
    
    const tokenRequestBody = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    });

    console.log('[google-oauth-callback] Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('[google-oauth-callback] Token exchange failed');
      console.error('[google-oauth-callback] Error response:', JSON.stringify(errorData));
      
      // Map Google token errors to user-friendly messages
      const googleError = errorData.error || 'token_exchange_failed';
      const googleErrorDesc = errorData.error_description || 'Failed to exchange authorization code';
      
      let errorCode = 'token_exchange_failed';
      let errorMessage = googleErrorDesc;
      
      if (googleError === 'invalid_grant') {
        errorCode = 'invalid_grant';
        errorMessage = 'Authorization code expired or already used. Please try again.';
      } else if (googleError === 'invalid_client') {
        errorCode = 'invalid_client';
        errorMessage = 'OAuth client configuration error. Contact administrator.';
      } else if (googleError === 'redirect_uri_mismatch') {
        errorCode = 'redirect_uri_mismatch';
        errorMessage = 'Redirect URI does not match Google console configuration.';
        console.error('[google-oauth-callback] Redirect URI used:', redirectUri);
      }
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(redirectBase, errorCode, errorMessage),
        },
      });
    }

    const tokens = await tokenResponse.json();
    console.log('[google-oauth-callback] Tokens received successfully');
    console.log('[google-oauth-callback] Has access_token:', !!tokens.access_token);
    console.log('[google-oauth-callback] Has refresh_token:', !!tokens.refresh_token);
    console.log('[google-oauth-callback] Expires in:', tokens.expires_in, 'seconds');

    if (!tokens.access_token) {
      console.error('[google-oauth-callback] No access_token in response');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(redirectBase, 'no_access_token', 'Google did not return an access token'),
        },
      });
    }

    // Fetch Google user info to get email
    let googleEmail: string | null = null;
    try {
      console.log('[google-oauth-callback] Fetching user info from Google...');
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        googleEmail = userInfo.email || null;
        console.log('[google-oauth-callback] Google email:', googleEmail);
      } else {
        console.warn('[google-oauth-callback] Failed to fetch user info:', userInfoResponse.status);
      }
    } catch (userInfoError) {
      console.warn('[google-oauth-callback] Error fetching user info:', userInfoError);
      // Continue without email - it's not critical
    }

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();
    console.log('[google-oauth-callback] Token expires at:', expiresAt);

    // Save tokens to database using service role
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    console.log('[google-oauth-callback] Saving tokens to database for user:', user_id);

    // Determine refresh_token to save - preserve existing if Google didn't return a new one
    let refreshTokenToSave = tokens.refresh_token;
    
    if (!refreshTokenToSave) {
      console.log('[google-oauth-callback] No refresh_token in response, preserving existing one from database');
      const { data: existingToken } = await supabaseAdmin
        .from('user_google_tokens')
        .select('refresh_token')
        .eq('user_id', user_id)
        .single();
      
      if (existingToken?.refresh_token) {
        refreshTokenToSave = existingToken.refresh_token;
        console.log('[google-oauth-callback] Using existing refresh_token from database');
      } else {
        console.warn('[google-oauth-callback] No existing refresh_token found either - user may need to re-authorize with consent');
      }
    }

    // Upsert tokens (update if exists, insert if not)
    const { error: upsertError } = await supabaseAdmin
      .from('user_google_tokens')
      .upsert({
        user_id,
        access_token: tokens.access_token,
        refresh_token: refreshTokenToSave,
        expires_at: expiresAt,
        calendar_id: 'primary',
        google_email: googleEmail,
        refresh_fail_count: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('[google-oauth-callback] Failed to save tokens to database');
      console.error('[google-oauth-callback] Database error:', JSON.stringify(upsertError));
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': buildErrorRedirect(redirectBase, 'database_error', 'Failed to save tokens to database'),
        },
      });
    }

    console.log('[google-oauth-callback] ========== OAuth Callback Completed Successfully ==========');
    console.log('[google-oauth-callback] User:', user_id, 'is now connected to Google Calendar');

    // Redirect back to app with success
    const successUrl = new URL(`${redirectBase}/my-account`);
    successUrl.searchParams.set('google_connected', 'true');
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': successUrl.toString(),
      },
    });

  } catch (error) {
    console.error('[google-oauth-callback] ========== Unexpected Error ==========');
    console.error('[google-oauth-callback] Error:', error);
    console.error('[google-oauth-callback] Stack:', error instanceof Error ? error.stack : 'no stack');
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': buildErrorRedirect(defaultRedirectBase, 'unexpected_error', 'An unexpected error occurred'),
      },
    });
  }
});
