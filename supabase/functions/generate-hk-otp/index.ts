import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate OTP code in format ZW-XXXX-XX (ZW = Zdrowa Wiedza)
function generateOTPCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ZW-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 2; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User client for auth validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Claims error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Nieautoryzowany dostęp' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Parse request body
    const { knowledge_id, recipient_name, recipient_email } = await req.json();

    if (!knowledge_id) {
      return new Response(
        JSON.stringify({ error: 'Brak ID materiału' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get knowledge item details
    const { data: knowledge, error: knowledgeError } = await supabaseAdmin
      .from('healthy_knowledge')
      .select('*')
      .eq('id', knowledge_id)
      .eq('is_active', true)
      .eq('allow_external_share', true)
      .single();

    if (knowledgeError || !knowledge) {
      console.error('Knowledge error:', knowledgeError);
      return new Response(
        JSON.stringify({ error: 'Materiał nie istnieje lub nie można go udostępniać' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get partner profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();

    const partnerName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
      : 'Partner';

    // Generate unique OTP code
    let otpCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      otpCode = generateOTPCode();
      const { data: existing } = await supabaseAdmin
        .from('hk_otp_codes')
        .select('id')
        .eq('code', otpCode)
        .maybeSingle();
      
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: 'Nie udało się wygenerować unikalnego kodu' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiration
    const validityHours = knowledge.otp_validity_hours || 24;
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

    // Create OTP code record
    const { data: newCode, error: insertError } = await supabaseAdmin
      .from('hk_otp_codes')
      .insert({
        knowledge_id: knowledge_id,
        partner_id: userId,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
        recipient_name: recipient_name || null,
        recipient_email: recipient_email || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Nie udało się utworzyć kodu' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get base URL from page_settings
    const { data: settingsData } = await supabaseAdmin
      .from('page_settings')
      .select('app_base_url')
      .limit(1)
      .maybeSingle();

    const baseUrl = settingsData?.app_base_url || 'https://purelife.info.pl';

    // Generate share URL with proper domain
    const shareUrl = `${baseUrl}/zdrowa-wiedza/${knowledge.slug}`;
    
    // Use custom template or default
    const template = knowledge.share_message_template || `Cześć!

Mam dla Ciebie ciekawy materiał: "{title}"

{description}

Wejdź na link poniżej i użyj kodu dostępu:

🔗 Link: {share_url}
🔑 Kod dostępu: {otp_code}

⏰ Kod ważny przez {validity_hours} godzin.

Pozdrawiam,
{partner_name}`;

    // Replace placeholders in template
    const clipboardMessage = template
      .replace('{title}', knowledge.title)
      .replace('{description}', knowledge.description || '')
      .replace('{share_url}', shareUrl)
      .replace('{otp_code}', otpCode)
      .replace('{validity_hours}', String(validityHours))
      .replace('{partner_name}', partnerName);

    console.log(`Generated HK OTP code ${otpCode} for knowledge ${knowledge_id} by user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        clipboard_message: clipboardMessage,
        share_url: shareUrl,
        validity_hours: validityHours
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate HK OTP error:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił błąd serwera' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
