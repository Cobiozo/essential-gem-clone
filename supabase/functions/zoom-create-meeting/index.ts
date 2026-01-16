import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateMeetingRequest {
  event_id?: string;
  topic: string;
  start_time: string;
  duration: number;
  settings?: {
    waiting_room?: boolean;
    mute_upon_entry?: boolean;
    host_video?: boolean;
    participant_video?: boolean;
  };
}

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
  password: string;
  topic: string;
  start_time: string;
  duration: number;
}

async function getZoomAccessToken(): Promise<string> {
  const accountId = Deno.env.get('ZOOM_ACCOUNT_ID');
  const clientId = Deno.env.get('ZOOM_CLIENT_ID');
  const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('zoom_not_configured');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get Zoom access token:', error);
    throw new Error('zoom_auth_failed');
  }

  const data = await response.json();
  return data.access_token;
}

async function createZoomMeeting(
  accessToken: string,
  request: CreateMeetingRequest,
  defaultSettings?: {
    default_waiting_room?: boolean;
    default_mute_on_entry?: boolean;
    default_auto_recording?: string;
    default_host_email?: string | null;
  }
): Promise<ZoomMeetingResponse> {
  const hostEmail = defaultSettings?.default_host_email || Deno.env.get('ZOOM_HOST_EMAIL') || 'me';
  
  const meetingData = {
    topic: request.topic,
    type: 2, // Scheduled meeting
    start_time: request.start_time,
    duration: request.duration,
    timezone: 'Europe/Warsaw',
    settings: {
      waiting_room: request.settings?.waiting_room ?? defaultSettings?.default_waiting_room ?? true,
      mute_upon_entry: request.settings?.mute_upon_entry ?? defaultSettings?.default_mute_on_entry ?? true,
      host_video: request.settings?.host_video ?? true,
      participant_video: request.settings?.participant_video ?? true,
      join_before_host: false,
      approval_type: 0, // Automatically approve
      audio: 'both',
      auto_recording: defaultSettings?.default_auto_recording ?? 'none',
    },
  };

  console.log('Creating Zoom meeting with data:', JSON.stringify(meetingData));

  const response = await fetch(
    `https://api.zoom.us/v2/users/${hostEmail}/meetings`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingData),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to create Zoom meeting:', error);
    throw new Error(`zoom_api_error: ${error}`);
  }

  const meeting = await response.json();
  console.log('Zoom meeting created successfully:', meeting.id);
  
  return {
    id: meeting.id,
    join_url: meeting.join_url,
    start_url: meeting.start_url,
    password: meeting.password,
    topic: meeting.topic,
    start_time: meeting.start_time,
    duration: meeting.duration,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: CreateMeetingRequest = await req.json();
    console.log('Received request:', JSON.stringify(requestData));

    // Validate required fields
    if (!requestData.topic || !requestData.start_time || !requestData.duration) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'validation_error',
          message: 'Topic, start_time, and duration are required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Zoom access token and create meeting
    let accessToken: string;
    try {
      accessToken = await getZoomAccessToken();
    } catch (error) {
      if (error.message === 'zoom_not_configured') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'zoom_not_configured',
            message: 'Integracja Zoom nie jest skonfigurowana',
            instructions: [
              '1. Przejdź do https://marketplace.zoom.us/',
              '2. Utwórz Server-to-Server OAuth App',
              '3. Nadaj uprawnienia: meeting:write:admin, meeting:read:admin, user:read:admin',
              '4. Dodaj sekrety w ustawieniach projektu Supabase:',
              '   - ZOOM_ACCOUNT_ID',
              '   - ZOOM_CLIENT_ID',
              '   - ZOOM_CLIENT_SECRET',
              '   - ZOOM_HOST_EMAIL (opcjonalnie - domyślnie użyje "me")'
            ]
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

    // Load default settings from database
    const { data: zoomSettings } = await supabase
      .from('zoom_integration_settings')
      .select('*')
      .limit(1)
      .single();

    const zoomMeeting = await createZoomMeeting(accessToken, requestData, zoomSettings || undefined);

    // If event_id provided, update the event with Zoom data
    if (requestData.event_id) {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          zoom_link: zoomMeeting.join_url,
          zoom_meeting_id: zoomMeeting.id.toString(),
          zoom_start_url: zoomMeeting.start_url,
          zoom_password: zoomMeeting.password,
          zoom_auto_generated: true,
          zoom_generated_at: new Date().toISOString(),
        })
        .eq('id', requestData.event_id);

      if (updateError) {
        console.error('Failed to update event with Zoom data:', updateError);
        // Don't fail the request, meeting was created successfully
      } else {
        console.log('Event updated with Zoom meeting data:', requestData.event_id);
      }
    }

    // Update zoom_integration_settings status
    await supabase
      .from('zoom_integration_settings')
      .update({
        is_configured: true,
        api_status: 'active',
        last_api_check_at: new Date().toISOString(),
      })
      .eq('id', (await supabase.from('zoom_integration_settings').select('id').single()).data?.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          meeting_id: zoomMeeting.id.toString(),
          join_url: zoomMeeting.join_url,
          start_url: zoomMeeting.start_url,
          password: zoomMeeting.password,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in zoom-create-meeting:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'internal_error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
