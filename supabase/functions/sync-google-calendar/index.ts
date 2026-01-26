import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  user_id?: string;
  user_ids?: string[]; // Support batch sync
  event_id?: string;
  action: 'create' | 'update' | 'delete' | 'test';
  occurrence_index?: number; // For cyclic events - which occurrence to sync
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
  occurrences?: any; // Array of occurrence objects for cyclic events
}

// Get specific occurrence datetime for cyclic events
function getOccurrenceDateTime(
  occurrences: any, 
  occurrenceIndex: number | undefined,
  baseStartTime: string,
  baseEndTime: string | null
): { start_time: string; end_time: string } {
  // If no occurrence_index or no occurrences array, use base times
  if (occurrenceIndex === undefined || occurrenceIndex === null) {
    return { 
      start_time: baseStartTime, 
      end_time: baseEndTime || new Date(new Date(baseStartTime).getTime() + 60*60*1000).toISOString()
    };
  }

  // Parse occurrences (can be string or array)
  let parsedOccurrences: any[] | null = null;
  
  if (Array.isArray(occurrences)) {
    parsedOccurrences = occurrences;
  } else if (typeof occurrences === 'string') {
    try {
      parsedOccurrences = JSON.parse(occurrences);
    } catch {
      parsedOccurrences = null;
    }
  }

  // If no valid occurrences or index out of range, use base times
  if (!parsedOccurrences || !Array.isArray(parsedOccurrences) || occurrenceIndex >= parsedOccurrences.length) {
    console.log('[sync-google-calendar] No valid occurrence found for index:', occurrenceIndex, 'total:', parsedOccurrences?.length);
    return { 
      start_time: baseStartTime, 
      end_time: baseEndTime || new Date(new Date(baseStartTime).getTime() + 60*60*1000).toISOString()
    };
  }

  const occurrence = parsedOccurrences[occurrenceIndex];
  
  // Parse occurrence date/time
  const [year, month, day] = occurrence.date.split('-').map(Number);
  const [hours, minutes] = occurrence.time.split(':').map(Number);
  const durationMinutes = occurrence.duration_minutes || 60;

  // Create Date objects - use UTC to avoid timezone issues, then format for Warsaw
  const startDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  console.log('[sync-google-calendar] Using occurrence', occurrenceIndex, ':', occurrence.date, occurrence.time, 'duration:', durationMinutes);

  return {
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
  };
}

// Log sync operation to database (fire-and-forget)
async function logSyncOperation(
  supabase: any,
  userId: string,
  eventId: string | null,
  action: string,
  status: 'success' | 'error' | 'skipped',
  responseTimeMs: number,
  errorMessage?: string,
  metadata?: any
) {
  try {
    await supabase.from('google_calendar_sync_logs').insert({
      user_id: userId,
      event_id: eventId,
      action,
      status,
      response_time_ms: responseTimeMs,
      error_message: errorMessage || null,
      metadata: metadata || null,
    });
  } catch (e) {
    console.error('[sync-google-calendar] Failed to log operation:', e);
  }
}

// Refresh Google access token if expired
async function refreshAccessToken(refreshToken: string): Promise<{ 
  access_token?: string; 
  expires_in?: number; 
  error?: string;
  token_revoked?: boolean;
} | null> {
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
      const errorData = await response.json().catch(() => ({ error: 'unknown' }));
      console.error('[sync-google-calendar] Token refresh failed:', errorData);
      
      // Detect invalid_grant - token is permanently revoked
      if (errorData.error === 'invalid_grant') {
        console.log('[sync-google-calendar] Token was revoked by user (invalid_grant)');
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
    console.error('[sync-google-calendar] Token refresh error:', error);
    return null;
  }
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(supabase: any, userId: string): Promise<{
  access_token?: string;
  token_revoked?: boolean;
} | null> {
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
    
    const refreshResult = await refreshAccessToken(tokenData.refresh_token);
    
    // Token was revoked - delete from database
    if (refreshResult?.token_revoked) {
      console.log('[sync-google-calendar] Token revoked by user, removing from database for user:', userId);
      await supabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', userId);
      
      // Also clean up sync records
      await supabase
        .from('event_google_sync')
        .delete()
        .eq('user_id', userId);
      
      return { token_revoked: true };
    }
    
    if (!refreshResult?.access_token) {
      return null;
    }

    const newExpiresAt = new Date(Date.now() + (refreshResult.expires_in! * 1000)).toISOString();

    await supabase
      .from('user_google_tokens')
      .update({
        access_token: refreshResult.access_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { access_token: refreshResult.access_token };
  }

  return { access_token: tokenData.access_token };
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

// Process sync for a single user
async function processSyncForUser(
  supabaseAdmin: any,
  userId: string,
  eventId: string | undefined,
  action: string,
  eventData?: EventData,
  hostName?: string,
  occurrenceIndex?: number
): Promise<{ success: boolean; reason?: string; google_event_id?: string }> {
  const startTime = Date.now();
  
  try {
    // Get valid access token
    const tokenResult = await getValidAccessToken(supabaseAdmin, userId);
    
    // Handle token revoked
    if (tokenResult?.token_revoked) {
      const responseTime = Date.now() - startTime;
      logSyncOperation(supabaseAdmin, userId, eventId || null, action, 'error', responseTime, 'Token was revoked');
      return { success: false, reason: 'token_revoked' };
    }
    
    if (!tokenResult?.access_token) {
      const responseTime = Date.now() - startTime;
      // Log skipped - don't block, fire and forget
      logSyncOperation(supabaseAdmin, userId, eventId || null, action, 'skipped', responseTime, 'User not connected to Google Calendar');
      return { success: false, reason: 'not_connected' };
    }
    
    const accessToken = tokenResult.access_token;

    // Get user's calendar ID
    const { data: tokenData } = await supabaseAdmin
      .from('user_google_tokens')
      .select('calendar_id')
      .eq('user_id', userId)
      .single();

    const calendarId = tokenData?.calendar_id || 'primary';

    if (action === 'delete' && eventId) {
      // Get existing sync record - include occurrence_index in lookup
      let syncQuery = supabaseAdmin
        .from('event_google_sync')
        .select('google_event_id')
        .eq('event_id', eventId)
        .eq('user_id', userId);
      
      // Add occurrence_index filter for cyclic events
      if (occurrenceIndex !== undefined) {
        syncQuery = syncQuery.eq('occurrence_index', occurrenceIndex);
      } else {
        syncQuery = syncQuery.is('occurrence_index', null);
      }
      
      const { data: syncRecord } = await syncQuery.single();

      if (syncRecord?.google_event_id) {
        const deleted = await deleteGoogleEvent(accessToken, calendarId, syncRecord.google_event_id);
        
        if (deleted) {
          // Delete sync record with same filters
          let deleteQuery = supabaseAdmin
            .from('event_google_sync')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', userId);
          
          if (occurrenceIndex !== undefined) {
            deleteQuery = deleteQuery.eq('occurrence_index', occurrenceIndex);
          } else {
            deleteQuery = deleteQuery.is('occurrence_index', null);
          }
          
          await deleteQuery;
        }

        const responseTime = Date.now() - startTime;
        logSyncOperation(supabaseAdmin, userId, eventId, action, deleted ? 'success' : 'error', responseTime, deleted ? undefined : 'Delete failed', { occurrence_index: occurrenceIndex });
        return { success: deleted };
      }

      const responseTime = Date.now() - startTime;
      logSyncOperation(supabaseAdmin, userId, eventId, action, 'skipped', responseTime, 'No sync record found', { occurrence_index: occurrenceIndex });
      return { success: true, reason: 'no_sync_record' };
    }

    if (!eventData) {
      const responseTime = Date.now() - startTime;
      logSyncOperation(supabaseAdmin, userId, eventId || null, action, 'error', responseTime, 'No event data provided');
      return { success: false, reason: 'no_event_data' };
    }

    const googleEventData = formatGoogleEvent(eventData, hostName);

    if (action === 'update' && eventId) {
      // Check for existing sync record - include occurrence_index
      let syncQuery = supabaseAdmin
        .from('event_google_sync')
        .select('google_event_id')
        .eq('event_id', eventId)
        .eq('user_id', userId);
      
      if (occurrenceIndex !== undefined) {
        syncQuery = syncQuery.eq('occurrence_index', occurrenceIndex);
      } else {
        syncQuery = syncQuery.is('occurrence_index', null);
      }
      
      const { data: syncRecord } = await syncQuery.single();

      if (syncRecord?.google_event_id) {
        const updated = await updateGoogleEvent(accessToken, calendarId, syncRecord.google_event_id, googleEventData);
        
        if (updated) {
          let updateQuery = supabaseAdmin
            .from('event_google_sync')
            .update({ synced_at: new Date().toISOString() })
            .eq('event_id', eventId)
            .eq('user_id', userId);
          
          if (occurrenceIndex !== undefined) {
            updateQuery = updateQuery.eq('occurrence_index', occurrenceIndex);
          } else {
            updateQuery = updateQuery.is('occurrence_index', null);
          }
          
          await updateQuery;
        }

        const responseTime = Date.now() - startTime;
        logSyncOperation(supabaseAdmin, userId, eventId, action, updated ? 'success' : 'error', responseTime, updated ? undefined : 'Update failed', { occurrence_index: occurrenceIndex });
        return { success: updated };
      }

      // No existing record, fall through to create
    }

    // Create new event
    const googleEventId = await createGoogleEvent(accessToken, calendarId, googleEventData);

    if (!googleEventId) {
      const responseTime = Date.now() - startTime;
      logSyncOperation(supabaseAdmin, userId, eventId || null, action, 'error', responseTime, 'Create failed', { occurrence_index: occurrenceIndex });
      return { success: false, reason: 'create_failed' };
    }

    // Save sync record - use upsert with occurrence_index
    if (eventId) {
      // Build the upsert data
      const upsertData: any = {
        event_id: eventId,
        user_id: userId,
        google_event_id: googleEventId,
        synced_at: new Date().toISOString(),
        occurrence_index: occurrenceIndex ?? null,
      };
      
      // For the unique constraint, we need to handle it differently
      // First try to find existing record
      let existingQuery = supabaseAdmin
        .from('event_google_sync')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId);
      
      if (occurrenceIndex !== undefined) {
        existingQuery = existingQuery.eq('occurrence_index', occurrenceIndex);
      } else {
        existingQuery = existingQuery.is('occurrence_index', null);
      }
      
      const { data: existing } = await existingQuery.maybeSingle();
      
      if (existing) {
        // Update existing
        let updateQuery = supabaseAdmin
          .from('event_google_sync')
          .update({
            google_event_id: googleEventId,
            synced_at: new Date().toISOString(),
          })
          .eq('event_id', eventId)
          .eq('user_id', userId);
        
        if (occurrenceIndex !== undefined) {
          updateQuery = updateQuery.eq('occurrence_index', occurrenceIndex);
        } else {
          updateQuery = updateQuery.is('occurrence_index', null);
        }
        
        await updateQuery;
      } else {
        // Insert new
        await supabaseAdmin
          .from('event_google_sync')
          .insert(upsertData);
      }
    }

    const responseTime = Date.now() - startTime;
    logSyncOperation(supabaseAdmin, userId, eventId || null, action, 'success', responseTime, undefined, { occurrence_index: occurrenceIndex });
    return { success: true, google_event_id: googleEventId };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    logSyncOperation(supabaseAdmin, userId, eventId || null, action, 'error', responseTime, error.message || 'Unknown error', { occurrence_index: occurrenceIndex });
    console.error('[sync-google-calendar] Process sync error for user', userId, ':', error);
    return { success: false, reason: 'sync_error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: SyncRequest = await req.json();
    const { user_id, user_ids, event_id, action, occurrence_index } = requestData;
    
    // Support both single user_id and batch user_ids
    const usersToSync = user_ids || (user_id ? [user_id] : []);

    console.log(`[sync-google-calendar] Processing ${action} for ${usersToSync.length} user(s), event ${event_id || 'N/A'}, occurrence_index: ${occurrence_index ?? 'N/A'}`);

    if (usersToSync.length === 0 || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Handle test action - doesn't require event_id
    if (action === 'test') {
      const testUserId = usersToSync[0];
      const startTime = Date.now();
      
      // Check if user has a token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      if (tokenError || !tokenData) {
        const responseTime = Date.now() - startTime;
        logSyncOperation(supabaseAdmin, testUserId, null, 'test', 'error', responseTime, 'No token found');
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Nie znaleziono połączenia z Google Calendar.' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Try to get a valid access token (this will refresh if needed)
      const tokenResult = await getValidAccessToken(supabaseAdmin, testUserId);
      
      // Check if token was revoked
      if (tokenResult?.token_revoked) {
        const responseTime = Date.now() - startTime;
        logSyncOperation(supabaseAdmin, testUserId, null, 'test', 'error', responseTime, 'Token was revoked');
        return new Response(JSON.stringify({ 
          success: false, 
          token_revoked: true,
          message: 'Token został unieważniony. Rozłącz i połącz ponownie z Google Calendar.' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!tokenResult?.access_token) {
        const responseTime = Date.now() - startTime;
        logSyncOperation(supabaseAdmin, testUserId, null, 'test', 'error', responseTime, 'Token refresh failed');
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Token wygasł i nie można go odświeżyć. Połącz ponownie.' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const accessToken = tokenResult.access_token;

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

        const responseTime = Date.now() - startTime;

        if (calendarResponse.ok) {
          logSyncOperation(supabaseAdmin, testUserId, null, 'test', 'success', responseTime);
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
          logSyncOperation(supabaseAdmin, testUserId, null, 'test', 'error', responseTime, 'API access error');
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Błąd dostępu do Google Calendar API.' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (apiError) {
        const responseTime = Date.now() - startTime;
        console.error('[sync-google-calendar] API test error:', apiError);
        logSyncOperation(supabaseAdmin, testUserId, null, 'test', 'error', responseTime, 'Connection error');
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

    // Get event data (only needed once for all users)
    let eventData: EventData | null = null;
    let hostName: string | undefined;

    if (action !== 'delete') {
      const { data: eventResult, error: eventError } = await supabaseAdmin
        .from('events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          zoom_link,
          event_type,
          host_user_id,
          occurrences
        `)
        .eq('id', event_id)
        .single();

      if (eventError || !eventResult) {
        console.error('[sync-google-calendar] Event not found:', event_id);
        return new Response(JSON.stringify({ error: 'Event not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      eventData = eventResult;

      // Override start/end times with specific occurrence if provided (for cyclic events)
      if (occurrence_index !== undefined && eventData) {
        const occurrenceTimes = getOccurrenceDateTime(
          eventResult.occurrences,
          occurrence_index,
          eventResult.start_time,
          eventResult.end_time
        );
        
        eventData = {
          ...eventData,
          start_time: occurrenceTimes.start_time,
          end_time: occurrenceTimes.end_time,
        };
        
        console.log('[sync-google-calendar] Cyclic event: using occurrence', occurrence_index, 
          'start:', occurrenceTimes.start_time, 'end:', occurrenceTimes.end_time);
      }

      // Get host name if available
      if (eventResult.host_user_id) {
        const { data: hostProfile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', eventResult.host_user_id)
          .single();
        
        if (hostProfile) {
          hostName = `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim();
        }
      }
    }

    // Process sync for each user sequentially (to avoid Google API rate limiting)
    const results: { user_id: string; success: boolean; reason?: string }[] = [];
    
    for (const uid of usersToSync) {
      const result = await processSyncForUser(supabaseAdmin, uid, event_id, action, eventData!, hostName, occurrence_index);
      results.push({ user_id: uid, ...result });
    }

    // Check overall success
    const allSuccess = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({ 
      success: allSuccess,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
      }
    }), {
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
