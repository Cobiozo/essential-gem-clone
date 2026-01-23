import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { session_token, knowledge_slug } = await req.json();

    if (!session_token || !knowledge_slug) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Brak wymaganych danych' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find knowledge by slug
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('healthy_knowledge')
      .select('*')
      .eq('slug', knowledge_slug)
      .eq('is_active', true)
      .single();

    if (knowledgeError || !knowledge) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Materiał nie został znaleziony' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find session with OTP code
    const { data: session, error: sessionError } = await supabase
      .from('hk_otp_sessions')
      .select(`
        *,
        hk_otp_codes!inner (
          id,
          knowledge_id,
          is_invalidated
        )
      `)
      .eq('session_token', session_token)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Sesja nie istnieje' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Sesja wygasła' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP code is invalidated
    if (session.hk_otp_codes.is_invalidated) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Kod dostępu został unieważniony' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session is for correct knowledge
    if (session.hk_otp_codes.knowledge_id !== knowledge.id) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Sesja nie dotyczy tego materiału' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last activity
    await supabase
      .from('hk_otp_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id);

    const remainingSeconds = Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000);

    return new Response(
      JSON.stringify({
        valid: true,
        expires_at: session.expires_at,
        remaining_seconds: remainingSeconds,
        content: {
          id: knowledge.id,
          title: knowledge.title,
          description: knowledge.description,
          content_type: knowledge.content_type,
          media_url: knowledge.media_url,
          text_content: knowledge.text_content,
          duration_seconds: knowledge.duration_seconds,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify HK session error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Wystąpił błąd serwera' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
