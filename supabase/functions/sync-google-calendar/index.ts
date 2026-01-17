import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  user_id: string;
  event_id?: string;
  action: 'create' | 'update' | 'delete' | 'test';
}

interface EventData {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  zoom_link?: string;
  event_type: string;
  host_id?: string;
}

// Refresh Google access token if expired
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[sync-google-calendar] Missing Google credentials');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[sync-google-calendar] Token refresh failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[sync-google-calendar] Token refresh error:', error);
    return null;
  }
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: tokenData, error } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokenData) {
    console.log('[sync-google-calendar] No Google token found for user:', userId);
    return null;
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('[sync-google-calendar] Token expired or expiring soon, refreshing...');
    
    const newTokens = await refreshAccessToken(tokenData.refresh_token);
    if (!newTokens) {
      return null;
    }

    const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();

    await supabase
      .from('user_google_tokens')
      .update({
        access_token: newTokens.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return newTokens.access_token;
  }

  return tokenData.access_token;
}

// Format event for Google Calendar
function formatGoogleEvent(event: EventData, hostName?: string) {
  const startTime = new Date(event.start_time);
  const endTime = event.end_time 
    ? new Date(event.end_time) 
    : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

  let description = event.description || '';
  
  if (event.zoom_link) {
    description += `\n\n🔗 Link do spotkania: ${event.zoom_link}`;
  }
  
  if (hostName) {
    description += `\n\n👤 Prowadzący: ${hostName}`;
  }

  description += '\n\n📌 Wydarzenie z aplikacji PureLife';

  return {
    summary: `${event.title} - PureLife`,
    description: description.trim(),
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Europe/Warsaw',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Europe/Warsaw',
    },
    location: event.zoom_link || undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };
}

// Create event in Google Calendar
async function createGoogleEvent(accessToken: string, calendarId: string, eventData: any): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      console.error('[sync-google-calendar] Create event failed:', await response.text());
      return null;
    }

    const result = await response.json();
    console.log('[sync-google-calendar] Event created:', result.id);
    return result.id;
  } catch (error) {
    console.error('[sync-google-calendar] Create event error:', error);
    return null;
  }
}

// Update event in Google Calendar
async function updateGoogleEvent(accessToken: string, calendarId: string, googleEventId: string, eventData: any): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      console.error('[sync-google-calendar] Update event failed:', await response.text());
      return false;
    }

    console.log('[sync-google-calendar] Event updated:', googleEventId);
    return true;
  } catch (error) {
    console.error('[sync-google-calendar] Update event error:', error);
    return false;
  }
}

// Delete event from Google Calendar
async function deleteGoogleEvent(accessToken: string, calendarId: string, googleEventId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    // 204 No Content or 410 Gone (already deleted) are both success
    if (response.status === 204 || response.status === 410) {
      console.log('[sync-google-calendar] Event deleted:', googleEventId);
      return true;
    }

    console.error('[sync-google-calendar] Delete event failed:', await response.text());
    return false;
  } catch (error) {
    console.error('[sync-google-calendar] Delete event error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, event_id, action }: SyncRequest = await req.json();

    console.log(`[sync-google-calendar] Processing ${action} for user ${user_id}, event ${event_id || 'N/A'}`);

    if (!user_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle test action - doesn't require event_id
    if (action === 'test') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
      );

      // Check if user has a token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (tokenError || !tokenData) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Nie znaleziono połączenia z Google Calendar.' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Try to get a valid access token (this will refresh if needed)
      const accessToken = await getValidAccessToken(supabaseAdmin, user_id);
      
      if (!accessToken) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Token wygasł i nie można go odświeżyć. Połącz ponownie.' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Test API access by fetching calendar list
      try {
        const calendarResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (calendarResponse.ok) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Połączenie działa poprawnie! Token jest ważny.' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          const errorText = await calendarResponse.text();
          console.error('[sync-google-calendar] Calendar API test failed:', errorText);
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Błąd dostępu do Google Calendar API.' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (apiError) {
        console.error('[sync-google-calendar] API test error:', apiError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Nie można połączyć się z Google Calendar API.' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // For non-test actions, event_id is required
    if (!event_id) {
      return new Response(JSON.stringify({ error: 'Missing event_id for this action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Get valid access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user_id);
    if (!accessToken) {
      console.log('[sync-google-calendar] User not connected to Google Calendar');
      return new Response(JSON.stringify({ success: false, reason: 'not_connected' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's calendar ID
    const { data: tokenData } = await supabaseAdmin
      .from('user_google_tokens')
      .select('calendar_id')
      .eq('user_id', user_id)
      .single();

    const calendarId = tokenData?.calendar_id || 'primary';

    if (action === 'delete') {
      // Get existing sync record
      const { data: syncRecord } = await supabaseAdmin
        .from('event_google_sync')
        .select('google_event_id')
        .eq('event_id', event_id)
        .eq('user_id', user_id)
        .single();

      if (syncRecord?.google_event_id) {
        const deleted = await deleteGoogleEvent(accessToken, calendarId, syncRecord.google_event_id);
        
        if (deleted) {
          await supabaseAdmin
            .from('event_google_sync')
            .delete()
            .eq('event_id', event_id)
            .eq('user_id', user_id);
        }

        return new Response(JSON.stringify({ success: deleted }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, reason: 'no_sync_record' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get event data
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        zoom_link,
        event_type,
        host_user_id
      `)
      .eq('id', event_id)
      .single();

    if (eventError || !eventData) {
      console.error('[sync-google-calendar] Event not found:', event_id);
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get host name if available
    let hostName: string | undefined;
    if (eventData.host_user_id) {
      const { data: hostProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', eventData.host_user_id)
        .single();
      
      if (hostProfile) {
        hostName = `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim();
      }
    }

    const googleEventData = formatGoogleEvent(eventData, hostName);

    if (action === 'update') {
      // Check for existing sync record
      const { data: syncRecord } = await supabaseAdmin
        .from('event_google_sync')
        .select('google_event_id')
        .eq('event_id', event_id)
        .eq('user_id', user_id)
        .single();

      if (syncRecord?.google_event_id) {
        const updated = await updateGoogleEvent(accessToken, calendarId, syncRecord.google_event_id, googleEventData);
        
        if (updated) {
          await supabaseAdmin
            .from('event_google_sync')
            .update({ synced_at: new Date().toISOString() })
            .eq('event_id', event_id)
            .eq('user_id', user_id);
        }

        return new Response(JSON.stringify({ success: updated }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // No existing record, fall through to create
    }

    // Create new event
    const googleEventId = await createGoogleEvent(accessToken, calendarId, googleEventData);

    if (!googleEventId) {
      return new Response(JSON.stringify({ success: false, reason: 'create_failed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save sync record
    await supabaseAdmin
      .from('event_google_sync')
      .upsert({
        event_id,
        user_id,
        google_event_id: googleEventId,
        synced_at: new Date().toISOString(),
      }, {
        onConflict: 'event_id,user_id',
      });

    return new Response(JSON.stringify({ success: true, google_event_id: googleEventId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sync-google-calendar] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
