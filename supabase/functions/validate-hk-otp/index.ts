import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate session token (64 chars)
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

    const { knowledge_slug, otp_code, device_fingerprint } = await req.json();

    if (!knowledge_slug || !otp_code) {
      return new Response(
        JSON.stringify({ error: 'Brak wymaganych danych' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize OTP code (uppercase)
    const normalizedCode = otp_code.toUpperCase().trim();

    // Find knowledge by slug
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('healthy_knowledge')
      .select('*')
      .eq('slug', knowledge_slug)
      .eq('is_active', true)
      .single();

    if (knowledgeError || !knowledge) {
      console.error('Knowledge not found:', knowledgeError);
      return new Response(
        JSON.stringify({ error: 'Materiał nie został znaleziony' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find valid OTP code (check expires_at > now for codes not yet used, or first_used_at is set)
    const { data: otpCodeRecord, error: otpError } = await supabase
      .from('hk_otp_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('knowledge_id', knowledge.id)
      .eq('is_invalidated', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpCodeRecord) {
      console.error('Invalid OTP code:', otpError);
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowy lub wygasły kod dostępu' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if max sessions reached
    const maxSessions = knowledge.otp_max_sessions || 3;
    if (otpCodeRecord.used_sessions >= maxSessions) {
      return new Response(
        JSON.stringify({ error: 'Limit użyć kodu został wyczerpany' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get validity hours from knowledge
    const validityHours = knowledge.otp_validity_hours || 24;
    
    // If this is the first use, set first_used_at and recalculate expires_at
    let effectiveExpiresAt: Date;
    
    if (!otpCodeRecord.first_used_at) {
      // First use - start the access timer now
      const accessExpiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);
      
      // Update OTP record with first_used_at and new expires_at
      const { error: updateError } = await supabase
        .from('hk_otp_codes')
        .update({ 
          first_used_at: new Date().toISOString(),
          expires_at: accessExpiresAt.toISOString()
        })
        .eq('id', otpCodeRecord.id);
      
      if (updateError) {
        console.error('Error updating first_used_at:', updateError);
      }
      
      effectiveExpiresAt = accessExpiresAt;
      console.log(`First use of HK OTP ${normalizedCode}, access expires at ${accessExpiresAt.toISOString()}`);
    } else {
      // Code was already used - use existing expires_at
      effectiveExpiresAt = new Date(otpCodeRecord.expires_at);
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    
    // Session expires at the effective expiry time
    const expiresAt = effectiveExpiresAt;

    // Create session
    const { error: sessionError } = await supabase
      .from('hk_otp_sessions')
      .insert({
        otp_code_id: otpCodeRecord.id,
        session_token: sessionToken,
        device_fingerprint: device_fingerprint || null,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Nie udało się utworzyć sesji' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment used sessions counter
    await supabase
      .from('hk_otp_codes')
      .update({ used_sessions: otpCodeRecord.used_sessions + 1 })
      .eq('id', otpCodeRecord.id);

    // Increment view count
    await supabase
      .from('healthy_knowledge')
      .update({ view_count: (knowledge.view_count || 0) + 1 })
      .eq('id', knowledge.id);

    const remainingSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    // Generate signed URL for private bucket (server-side with service role)
    let signedMediaUrl = knowledge.media_url;

    if (knowledge.media_url?.includes('supabase.co') && knowledge.media_url.includes('/storage/v1/object/')) {
      try {
        const urlObj = new URL(knowledge.media_url);
        // Extract bucket and file path from URL (handle both /public/ and /sign/ formats)
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
        
        if (pathMatch) {
          const [, bucket, filePath] = pathMatch;
          
          // Generate signed URL valid for 2 hours
          const { data: signedData, error: signError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(decodeURIComponent(filePath), 7200);
          
          if (!signError && signedData?.signedUrl) {
            signedMediaUrl = signedData.signedUrl;
            console.log(`Generated signed URL for ${bucket}/${filePath.substring(0, 30)}...`);
          } else {
            console.warn('Failed to generate signed URL:', signError);
          }
        }
      } catch (urlError) {
        console.error('Error parsing media URL for signing:', urlError);
      }
    }

    console.log(`Validated HK OTP ${normalizedCode} for knowledge ${knowledge.slug}, session created, expires in ${remainingSeconds}s`);

    return new Response(
      JSON.stringify({
        success: true,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        remaining_seconds: remainingSeconds,
        content: {
          id: knowledge.id,
          title: knowledge.title,
          description: knowledge.description,
          content_type: knowledge.content_type,
          media_url: signedMediaUrl,
          text_content: knowledge.text_content,
          duration_seconds: knowledge.duration_seconds,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validate HK OTP error:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił błąd serwera' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
