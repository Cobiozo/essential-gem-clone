import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a random session token
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

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
    const { reflink_slug, otp_code, device_fingerprint } = await req.json();

    if (!reflink_slug || !otp_code) {
      return new Response(
        JSON.stringify({ error: 'Brak wymaganych parametrów' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find reflink by slug or id
    let reflink;
    const { data: bySlug } = await supabase
      .from('reflinks')
      .select('*')
      .eq('slug', reflink_slug)
      .single();

    if (bySlug) {
      reflink = bySlug;
    } else {
      // Try by ID
      const { data: byId } = await supabase
        .from('reflinks')
        .select('*')
        .eq('id', reflink_slug)
        .single();
      reflink = byId;
    }

    if (!reflink) {
      return new Response(
        JSON.stringify({ error: 'Nie znaleziono InfoLinku' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find valid OTP code
    const normalizedCode = otp_code.toUpperCase().trim();
    const { data: otpRecord, error: otpError } = await supabase
      .from('infolink_otp_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('reflink_id', reflink.id)
      .eq('is_invalidated', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpRecord) {
      console.log('OTP validation failed:', { code: normalizedCode, reflink_id: reflink.id, error: otpError });
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowy lub wygasły kod dostępu' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check session limit
    const maxSessions = reflink.otp_max_sessions || 1;
    if (otpRecord.used_sessions >= maxSessions) {
      return new Response(
        JSON.stringify({ error: 'Przekroczono limit sesji dla tego kodu' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    
    // Get validity hours from reflink
    const validityHours = reflink.otp_validity_hours || 24;
    
    // Session expires X hours from NOW (when code is used), not from code generation
    const sessionFromNow = new Date(Date.now() + validityHours * 60 * 60 * 1000);
    
    // But session cannot outlive the OTP code itself (safety check)
    const otpExpiresAt = new Date(otpRecord.expires_at);
    const sessionExpiresAt = sessionFromNow < otpExpiresAt ? sessionFromNow : otpExpiresAt;

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('infolink_sessions')
      .insert({
        otp_code_id: otpRecord.id,
        session_token: sessionToken,
        device_fingerprint: device_fingerprint || null,
        expires_at: sessionExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Błąd podczas tworzenia sesji' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment used_sessions counter
    await supabase
      .from('infolink_otp_codes')
      .update({ used_sessions: otpRecord.used_sessions + 1 })
      .eq('id', otpRecord.id);

    // Calculate remaining time
    const remainingMs = sessionExpiresAt.getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    console.log(`Session created for OTP ${normalizedCode}, expires at ${sessionExpiresAt.toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString(),
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
    console.error('Error in validate-infolink-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił błąd serwera' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
