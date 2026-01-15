import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { session_token, reflink_slug } = await req.json();

    if (!session_token || !reflink_slug) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Brak wymaganych parametrów' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find reflink by slug or id
    let reflink;
    const { data: bySlug } = await supabase
      .from('reflinks')
      .select('id, protected_content, title')
      .eq('slug', reflink_slug)
      .single();

    if (bySlug) {
      reflink = bySlug;
    } else {
      const { data: byId } = await supabase
        .from('reflinks')
        .select('id, protected_content, title')
        .eq('id', reflink_slug)
        .single();
      reflink = byId;
    }

    if (!reflink) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Nie znaleziono InfoLinku' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find and validate session
    const { data: session, error: sessionError } = await supabase
      .from('infolink_sessions')
      .select(`
        *,
        infolink_otp_codes!inner (
          reflink_id,
          is_invalidated
        )
      `)
      .eq('session_token', session_token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Sesja wygasła lub nie istnieje' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session belongs to the correct reflink
    if (session.infolink_otp_codes.reflink_id !== reflink.id) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Sesja nie należy do tego InfoLinku' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP was invalidated
    if (session.infolink_otp_codes.is_invalidated) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Kod dostępu został unieważniony' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last activity
    await supabase
      .from('infolink_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id);

    // Calculate remaining time
    const expiresAt = new Date(session.expires_at);
    const remainingMs = expiresAt.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return new Response(
      JSON.stringify({
        valid: true,
        expires_at: session.expires_at,
        remaining_seconds: remainingSeconds,
        protected_content: reflink.protected_content,
        reflink_title: reflink.title,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-infolink-session:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Wystąpił błąd serwera' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
