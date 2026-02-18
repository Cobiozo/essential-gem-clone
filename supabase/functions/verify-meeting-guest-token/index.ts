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
    const { token, room_id } = await req.json();

    if (!token || !room_id) {
      return new Response(JSON.stringify({ error: 'Token i room_id są wymagane' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: guestToken, error } = await supabase
      .from('meeting_guest_tokens')
      .select('id, room_id, first_name, last_name, email, inviter_user_id, expires_at, event_id')
      .eq('token', token)
      .eq('room_id', room_id)
      .maybeSingle();

    if (error || !guestToken) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(guestToken.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token wygasł' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as used
    await supabase.from('meeting_guest_tokens').update({
      used_at: new Date().toISOString(),
    }).eq('id', guestToken.id);

    // Get inviter info
    const { data: inviter } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', guestToken.inviter_user_id)
      .single();

    return new Response(JSON.stringify({
      valid: true,
      guest_token_id: guestToken.id,
      first_name: guestToken.first_name,
      last_name: guestToken.last_name,
      email: guestToken.email,
      inviter: inviter ? {
        first_name: inviter.first_name,
        last_name: inviter.last_name,
        email: inviter.email,
      } : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[verify-meeting-guest-token] Error:', error);
    return new Response(JSON.stringify({ error: 'Błąd serwera' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
