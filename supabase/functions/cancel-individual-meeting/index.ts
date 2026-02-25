import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelMeetingRequest {
  event_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[cancel-individual-meeting] Request received');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[cancel-individual-meeting] No authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.log('[cancel-individual-meeting] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Nieprawidłowy token autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cancel-individual-meeting] User authenticated:', user.id);

    // Parse request body
    const { event_id }: CancelMeetingRequest = await req.json();
    if (!event_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Brak ID wydarzenia' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cancel-individual-meeting] Cancelling event:', event_id);

    // Create admin client with service role key to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      console.log('[cancel-individual-meeting] Event not found:', eventError);
      return new Response(
        JSON.stringify({ success: false, error: 'Wydarzenie nie zostało znalezione' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if meeting is within 2 hours - block cancellation
    const meetingStart = new Date(event.start_time);
    const now = new Date();
    const hoursUntilMeeting = (meetingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilMeeting <= 2 && hoursUntilMeeting > 0) {
      console.log('[cancel-individual-meeting] Cannot cancel - less than 2h before meeting');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nie można anulować spotkania na mniej niż 2 godziny przed jego rozpoczęciem' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is host or participant (created_by = booker)
    const isHost = event.host_user_id === user.id;
    const isBooker = event.created_by === user.id;

    if (!isHost && !isBooker) {
      console.log('[cancel-individual-meeting] User not authorized. Host:', event.host_user_id, 'Booker:', event.created_by, 'User:', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Nie masz uprawnień do anulowania tego spotkania' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user's profile for email
    const { data: currentUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();

    const cancelerName = currentUserProfile 
      ? `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim()
      : (isHost ? 'prowadzący' : 'uczestnik');

    console.log('[cancel-individual-meeting] Canceler:', cancelerName);

    // 1. Mark event as inactive
    const { error: updateEventError } = await supabaseAdmin
      .from('events')
      .update({ is_active: false })
      .eq('id', event_id);

    if (updateEventError) {
      console.log('[cancel-individual-meeting] Failed to update event:', updateEventError);
      return new Response(
        JSON.stringify({ success: false, error: 'Nie udało się anulować wydarzenia' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cancel-individual-meeting] Event marked as inactive');

    // 2. Cancel all registrations for this event
    const { error: updateRegistrationsError } = await supabaseAdmin
      .from('event_registrations')
      .update({ 
        status: 'cancelled', 
        cancelled_at: new Date().toISOString() 
      })
      .eq('event_id', event_id);

    if (updateRegistrationsError) {
      console.log('[cancel-individual-meeting] Failed to update registrations:', updateRegistrationsError);
      // Continue anyway - event is already cancelled
    } else {
      console.log('[cancel-individual-meeting] Registrations cancelled');
    }

    // 3. Get all participants (host + registered users)
    const { data: registrations } = await supabaseAdmin
      .from('event_registrations')
      .select('user_id')
      .eq('event_id', event_id);

    const allUserIds = new Set<string>();
    if (event.host_user_id) allUserIds.add(event.host_user_id);
    if (registrations) {
      registrations.forEach(r => {
        if (r.user_id) allUserIds.add(r.user_id);
      });
    }

    console.log('[cancel-individual-meeting] All participants:', Array.from(allUserIds));

    // 4. Delete from Google Calendar for all participants
    try {
      await supabaseAdmin.functions.invoke('sync-google-calendar', {
        body: {
          user_ids: Array.from(allUserIds),
          event_id: event_id,
          action: 'delete'
        }
      });
      console.log('[cancel-individual-meeting] Google Calendar sync initiated');
    } catch (gcalError) {
      console.log('[cancel-individual-meeting] Google Calendar sync failed (non-critical):', gcalError);
    }

    // 5. Get profiles of all participants for enriched emails
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, first_name, last_name, email')
      .in('user_id', Array.from(allUserIds));

    const hostProfile = allProfiles?.find(p => p.user_id === event.host_user_id);
    const bookerProfile = allProfiles?.find(p => p.user_id === event.created_by);

    // 6. Prepare email payload with participant data
    const eventStart = new Date(event.start_time);
    const dateStr = eventStart.toLocaleDateString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Warsaw'
    });
    const timeStr = eventStart.toLocaleTimeString('pl-PL', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw'
    });
    const timeWithTz = `${timeStr} (Warsaw)`;
    const emailPayload = {
      temat: event.title,
      data_spotkania: dateStr,
      godzina_spotkania: timeStr,
      kto_odwolal: cancelerName,
      imie_lidera: hostProfile?.first_name || '',
      nazwisko_lidera: hostProfile?.last_name || '',
      imie_rezerwujacego: bookerProfile?.first_name || '',
      nazwisko_rezerwujacego: bookerProfile?.last_name || '',
    };

    // 7. In-app notifications + Push + Email for all participants
    const emailPromises: Promise<any>[] = [];
    
    for (const participantId of allUserIds) {
      const isSelf = participantId === user.id;
      const payload = {
        ...emailPayload,
        kto_odwolal: isSelf ? 'Ty' : cancelerName
      };

      // In-app notification
      try {
        await supabaseAdmin.from('user_notifications').insert({
          user_id: participantId,
          notification_type: 'meeting_cancelled',
          source_module: 'meetings',
          title: 'Spotkanie anulowane',
          message: `${isSelf ? 'Ty anulowałeś/aś' : cancelerName + ' anulował(a)'} spotkanie ${event.title || ''} (${dateStr} ${timeWithTz})`,
          link: `/events/individual-meetings?event=${event.id}`,
          metadata: { event_id: event.id, cancelled_by: user.id },
        });
      } catch (inAppErr) {
        console.warn('[cancel-individual-meeting] In-app notification failed for', participantId, ':', inAppErr);
      }

      // Push notification
      try {
        await supabaseAdmin.functions.invoke('send-push-notification', {
          body: {
            userId: participantId,
            title: 'Spotkanie anulowane',
            body: `${isSelf ? 'Ty anulowałeś/aś' : cancelerName + ' anulował(a)'} ${event.title || 'spotkanie'} — ${dateStr} ${timeWithTz}`,
            url: `/events/individual-meetings?event=${event.id}`,
            tag: `meeting-cancelled-${event.id}`,
          },
        });
      } catch (pushErr) {
        console.warn('[cancel-individual-meeting] Push failed for', participantId, ':', pushErr);
      }

      // Email
      console.log('[cancel-individual-meeting] Sending email to:', participantId);
      
      emailPromises.push(
        supabaseAdmin.functions.invoke('send-notification-email', {
          body: {
            event_type_id: '8eb3bd8a-e558-468f-8f9f-11eccd108436', // event_cancelled
            recipient_user_id: participantId,
            payload: payload
          }
        }).catch(err => {
          console.log('[cancel-individual-meeting] Email failed for', participantId, ':', err);
          return { error: err };
        })
      );
    }

    // Wait for all emails to be sent
    const emailResults = await Promise.all(emailPromises);
    const successfulEmails = emailResults.filter(r => !r.error).length;
    console.log('[cancel-individual-meeting] Emails sent:', successfulEmails, '/', allUserIds.size);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Spotkanie zostało anulowane',
        emails_sent: successfulEmails,
        total_participants: allUserIds.size
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[cancel-individual-meeting] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Wystąpił nieoczekiwany błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
