import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DELTA = 30; // sekundy per ping (anti-nabijanie)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const session_token = typeof body.session_token === 'string' ? body.session_token : null;
    const raw_delta = Number(body.delta_seconds);
    const delta = Number.isFinite(raw_delta) ? Math.max(0, Math.min(MAX_DELTA, Math.floor(raw_delta))) : 0;
    const completed = body.completed === true;

    if (!session_token) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing session_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from('hk_otp_sessions')
      .select('id, expires_at, watched_seconds, completed_at, hk_otp_codes!inner(is_invalidated)')
      .eq('session_token', session_token)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Session not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (new Date(session.expires_at) < new Date() || (session as any).hk_otp_codes?.is_invalidated) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Session inactive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const newWatched = (session.watched_seconds ?? 0) + delta;
    const patch: Record<string, unknown> = {
      watched_seconds: newWatched,
      last_activity_at: new Date().toISOString(),
    };
    if (completed && !(session as any).completed_at) {
      patch.completed_at = new Date().toISOString();
    }

    const { error: updError } = await supabase
      .from('hk_otp_sessions')
      .update(patch)
      .eq('id', session.id);

    if (updError) {
      console.error('heartbeat update error', updError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Update failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }


    return new Response(
      JSON.stringify({ ok: true, watched_seconds: newWatched }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('hk-session-heartbeat error', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
