import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusyRequest {
  leader_user_id: string;
  date: string; // YYYY-MM-DD
}

interface BusySlot {
  start: string;
  end: string;
}

interface FreeBusyResponse {
  calendars: {
    [key: string]: {
      busy: BusySlot[];
    };
  };
}

interface RefreshTokenResult {
  access_token?: string;
  expires_in?: number;
  error?: string;
  token_revoked?: boolean;
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshTokenResult | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('[check-google-calendar-busy] Missing Google OAuth credentials');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'unknown' }));
      console.error('[check-google-calendar-busy] Token refresh failed:', errorData);
      
      // Wykryj invalid_grant - token trwale unieważniony przez użytkownika
      if (errorData.error === 'invalid_grant') {
        console.log('[check-google-calendar-busy] Token was revoked by user (invalid_grant)');
        return { error: 'invalid_grant', token_revoked: true };
      }
      
      return null;
    }

    const tokenData = await response.json();
    return { 
      access_token: tokenData.access_token, 
      expires_in: tokenData.expires_in 
    };
  } catch (error) {
    console.error('[check-google-calendar-busy] Token refresh error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leader_user_id, date } = await req.json() as BusyRequest;

    if (!leader_user_id || !date) {
      return new Response(
        JSON.stringify({ error: 'Missing leader_user_id or date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-google-calendar-busy] Checking busy times for user ${leader_user_id} on ${date}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's Google tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', leader_user_id)
      .maybeSingle();

    if (tokenError) {
      console.error('[check-google-calendar-busy] Token fetch error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Google tokens', busy: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      console.log('[check-google-calendar-busy] No Google token found for user');
      return new Response(
        JSON.stringify({ connected: false, busy: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired or expiring soon (within 5 minutes)
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('[check-google-calendar-busy] Token expired or expiring soon, refreshing...');
      
      const refreshResult = await refreshAccessToken(tokenData.refresh_token);
      
      // Token został unieważniony - wyczyść bazę danych
      if (refreshResult?.token_revoked) {
        console.log('[check-google-calendar-busy] Token revoked, cleaning up database for user:', leader_user_id);
        
        // Usuń nieważny token
        await supabase
          .from('user_google_tokens')
          .delete()
          .eq('user_id', leader_user_id);
        
        // Usuń powiązane rekordy synchronizacji
        await supabase
          .from('event_google_sync')
          .delete()
          .eq('user_id', leader_user_id);
        
        console.log('[check-google-calendar-busy] Cleanup complete for user:', leader_user_id);
        
        return new Response(
          JSON.stringify({ connected: false, token_revoked: true, busy: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!refreshResult?.access_token) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token', busy: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = refreshResult.access_token;
      
      // Update token in database
      const newExpiresAt = new Date(Date.now() + refreshResult.expires_in! * 1000);
      await supabase
        .from('user_google_tokens')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('user_id', leader_user_id);
    }

    // Call Google Calendar FreeBusy API
    const timeMin = `${date}T00:00:00Z`;
    const timeMax = `${date}T23:59:59Z`;

    const freeBusyResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/freeBusy',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          timeZone: 'Europe/Warsaw',
          items: [{ id: 'primary' }],
        }),
      }
    );

    if (!freeBusyResponse.ok) {
      const errorText = await freeBusyResponse.text();
      console.error('[check-google-calendar-busy] FreeBusy API error:', errorText);
      
      // Sprawdź czy to błąd autoryzacji (401) - token może być unieważniony
      if (freeBusyResponse.status === 401) {
        console.log('[check-google-calendar-busy] FreeBusy returned 401, token may be invalid');
        
        // Spróbuj odświeżyć token
        const refreshResult = await refreshAccessToken(tokenData.refresh_token);
        
        if (refreshResult?.token_revoked) {
          console.log('[check-google-calendar-busy] Token confirmed revoked during FreeBusy call, cleaning up');
          
          await supabase
            .from('user_google_tokens')
            .delete()
            .eq('user_id', leader_user_id);
          
          await supabase
            .from('event_google_sync')
            .delete()
            .eq('user_id', leader_user_id);
          
          return new Response(
            JSON.stringify({ connected: false, token_revoked: true, busy: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'FreeBusy API failed', busy: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const freeBusyData = await freeBusyResponse.json() as FreeBusyResponse;
    const busySlots = freeBusyData.calendars?.primary?.busy || [];

    console.log(`[check-google-calendar-busy] Found ${busySlots.length} busy slots for ${date}`);

    return new Response(
      JSON.stringify({ 
        connected: true,
        busy: busySlots 
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=60', // Cache for 1 minute
        } 
      }
    );

  } catch (error) {
    console.error('[check-google-calendar-busy] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', busy: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
