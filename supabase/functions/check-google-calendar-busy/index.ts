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

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
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
      const errorText = await response.text();
      console.error('[check-google-calendar-busy] Token refresh failed:', errorText);
      return null;
    }

    return await response.json();
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
      
      if (!refreshResult) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token', busy: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = refreshResult.access_token;
      
      // Update token in database
      const newExpiresAt = new Date(Date.now() + refreshResult.expires_in * 1000);
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-google-calendar-busy] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', busy: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
