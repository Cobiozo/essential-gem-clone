import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { room_id, first_name, last_name, email, inviter_user_id } = await req.json();

    // Validate input
    if (!room_id || !first_name?.trim() || !last_name?.trim() || !email?.trim() || !inviter_user_id) {
      return new Response(JSON.stringify({ error: 'Brakujące dane: imię, nazwisko, email i ID zapraszającego są wymagane' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy adres email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify event exists and allows guest access
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, allow_guest_access, use_internal_meeting, start_time')
      .eq('meeting_room_id', room_id)
      .eq('use_internal_meeting', true)
      .maybeSingle();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Spotkanie nie istnieje lub nie jest aktywne' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!event.allow_guest_access) {
      return new Response(JSON.stringify({ error: 'To spotkanie nie przyjmuje gości zewnętrznych' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if token already exists for this email + room
    const { data: existingToken } = await supabase
      .from('meeting_guest_tokens')
      .select('id, token, expires_at')
      .eq('room_id', room_id)
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existingToken && new Date(existingToken.expires_at) > new Date()) {
      // Return existing valid token
      return new Response(JSON.stringify({
        token: existingToken.token,
        guest_token_id: existingToken.id,
        event_title: event.title,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4h

    // Create guest token record
    const { data: guestToken, error: tokenError } = await supabase
      .from('meeting_guest_tokens')
      .upsert({
        room_id,
        event_id: event.id,
        inviter_user_id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        token,
        expires_at: expiresAt,
      }, { onConflict: 'room_id,email' })
      .select('id')
      .single();

    if (tokenError || !guestToken) {
      console.error('[generate-meeting-guest-token] Token creation error:', tokenError);
      return new Response(JSON.stringify({ error: 'Nie udało się wygenerować tokenu' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create analytics record
    await supabase.from('meeting_guest_analytics').insert({
      guest_token_id: guestToken.id,
      event_id: event.id,
      room_id,
      inviter_user_id,
    });

    // Add guest to inviter's private contacts (team_contacts)
    const { data: existingContact } = await supabase
      .from('team_contacts')
      .select('id')
      .eq('user_id', inviter_user_id)
      .eq('email', email.trim().toLowerCase())
      .eq('contact_type', 'private')
      .maybeSingle();

    if (existingContact) {
      // Update notes
      await supabase.from('team_contacts').update({
        notes: `Gość spotkania: ${event.title} - ${new Date().toLocaleDateString('pl-PL')}`,
        is_active: true,
      }).eq('id', existingContact.id);
    } else {
      await supabase.from('team_contacts').insert({
        user_id: inviter_user_id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        contact_type: 'private',
        role: 'client',
        relationship_status: 'potential_partner',
        notes: `Gość spotkania: ${event.title} - ${new Date().toLocaleDateString('pl-PL')}`,
        added_at: new Date().toISOString().split('T')[0],
        is_active: true,
      });
    }

    console.log(`[generate-meeting-guest-token] Token generated for ${email} in room ${room_id}`);

    return new Response(JSON.stringify({
      token,
      guest_token_id: guestToken.id,
      event_title: event.title,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-meeting-guest-token] Error:', error);
    return new Response(JSON.stringify({ error: 'Błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
