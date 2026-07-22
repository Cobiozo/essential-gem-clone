import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate OTP code in format BW-XXXX (4 digits)
function generateOTPCode(): string {
  const chars = '0123456789';
  let code = 'BW-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const messageTemplates: Record<string, string> = {
  pl: `Cześć!\n\nMam dla Ciebie ciekawy materiał:\n"{title}"\n\n{description}\n\nWejdź na link poniżej i użyj kodu dostępu:\n\n🔗 Link:\n{share_url}\n\n🔑 Kod dostępu:\n{otp_code}\n\n⏰ Po pierwszym użyciu masz {validity_hours} godzin dostępu.\n\nPozdrawiam,\n{partner_name}`,
  en: `Hi!\n\nI have an interesting material for you:\n"{title}"\n\n{description}\n\nOpen the link below and use the access code:\n\n🔗 Link:\n{share_url}\n\n🔑 Access code:\n{otp_code}\n\n⏰ After the first use, you will have {validity_hours} hours of access.\n\nBest regards,\n{partner_name}`,
  de: `Hallo!\n\nIch habe ein interessantes Material für dich:\n"{title}"\n\n{description}\n\nÖffne den Link unten und verwende den Zugangscode:\n\n🔗 Link:\n{share_url}\n\n🔑 Zugangscode:\n{otp_code}\n\n⏰ Nach der ersten Nutzung hast du {validity_hours} Stunden Zugang.\n\nViele Grüße,\n{partner_name}`,
  no: `Hei!\n\nJeg har et interessant materiale til deg:\n"{title}"\n\n{description}\n\nÅpne lenken nedenfor og bruk tilgangskoden:\n\n🔗 Lenke:\n{share_url}\n\n🔑 Tilgangskode:\n{otp_code}\n\n⏰ Etter første bruk har du {validity_hours} timer tilgang.\n\nVennlig hilsen,\n{partner_name}`,
  it: `Ciao!\n\nHo un materiale interessante per te:\n"{title}"\n\n{description}\n\nApri il link qui sotto e usa il codice di accesso:\n\n🔗 Link:\n{share_url}\n\n🔑 Codice di accesso:\n{otp_code}\n\n⏰ Dopo il primo utilizzo avrai {validity_hours} ore di accesso.\n\nCordiali saluti,\n{partner_name}`,
  es: `¡Hola!\n\nTengo un material interesante para ti:\n"{title}"\n\n{description}\n\nAbre el enlace de abajo y usa el código de acceso:\n\n🔗 Enlace:\n{share_url}\n\n🔑 Código de acceso:\n{otp_code}\n\n⏰ Después del primer uso tendrás {validity_hours} horas de acceso.\n\nSaludos,\n{partner_name}`,
  fr: `Bonjour !\n\nJ'ai un contenu intéressant pour vous :\n"{title}"\n\n{description}\n\nOuvrez le lien ci-dessous et utilisez le code d'accès :\n\n🔗 Lien :\n{share_url}\n\n🔑 Code d'accès :\n{otp_code}\n\n⏰ Après la première utilisation, vous aurez {validity_hours} heures d'accès.\n\nCordialement,\n{partner_name}`,
  pt: `Olá!\n\nTenho um material interessante para você:\n"{title}"\n\n{description}\n\nAbra o link abaixo e use o código de acesso:\n\n🔗 Link:\n{share_url}\n\n🔑 Código de acesso:\n{otp_code}\n\n⏰ Após o primeiro uso, você terá {validity_hours} horas de acesso.\n\nCumprimentos,\n{partner_name}`,
};

const fillTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/\{(title|description|share_url|otp_code|validity_hours|partner_name)\}/g, (_match, key) => values[key] ?? '');

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
    const { knowledge_id, recipient_name, recipient_email, message_language } = await req.json();
    const lang = typeof message_language === 'string' ? message_language.trim().toLowerCase() : 'pl';

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
      .select('first_name, last_name, eq_id')
      .eq('user_id', userId)
      .single();

    const partnerName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
      : 'Partner';
    const partnerEqId = profile?.eq_id || null;


    // Generate unique OTP code
    let otpCode: string;
    let attempts = 0;
    const maxAttempts = 50;

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

    // Calculate expiration - code has 7 days to be first used
    // Access timer only starts when code is first used (in validate-hk-otp)
    const validityHours = knowledge.otp_validity_hours || 24;
    const maxCodeLifetimeDays = 7;
    const expiresAt = new Date(Date.now() + maxCodeLifetimeDays * 24 * 60 * 60 * 1000);

    // Create OTP code record
    const { data: newCode, error: insertError } = await supabaseAdmin
      .from('hk_otp_codes')
      .insert({
        knowledge_id: knowledge_id,
        partner_id: userId,
        partner_eq_id: partnerEqId,
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

    const baseUrl = (settingsData?.app_base_url || 'https://purelifecenter.pl').replace(/\/$/, '');

    // Generate share URL with partner EQ ID (?ref=<eq_id>) for attribution
    const shareUrl = partnerEqId
      ? `${baseUrl}/zdrowa-wiedza/${knowledge.slug}?ref=${encodeURIComponent(partnerEqId)}`
      : `${baseUrl}/zdrowa-wiedza/${knowledge.slug}`;

    
    let localizedTitle = knowledge.title;
    let localizedDescription = knowledge.description || '';

    if (lang !== 'pl') {
      const { data: translation } = await supabaseAdmin
        .from('healthy_knowledge_translations')
        .select('title, description')
        .eq('item_id', knowledge_id)
        .eq('language_code', lang)
        .maybeSingle();

      if (translation?.title) localizedTitle = translation.title;
      if (translation?.description !== null && translation?.description !== undefined) {
        localizedDescription = translation.description || '';
      }
    }

    // Custom templates are authored per material in Polish. For other languages,
    // use the language template so changing the flag always changes the message text.
    const template = lang === 'pl' && knowledge.share_message_template
      ? knowledge.share_message_template
      : messageTemplates[lang] || messageTemplates.pl;

    // Replace placeholders in template
    const clipboardMessage = fillTemplate(template, {
      title: localizedTitle,
      description: localizedDescription,
      share_url: shareUrl,
      otp_code: otpCode,
      validity_hours: String(validityHours),
      partner_name: partnerName || 'Partner',
    });

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
