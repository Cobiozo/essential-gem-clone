import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strip HTML tags from text for plain text output
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')           // br -> newline
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')   // </p><p> -> double newline
    .replace(/<p[^>]*>/gi, '')               // opening p tags
    .replace(/<\/p>/gi, '\n')                // closing p tags
    .replace(/<[^>]+>/g, '')                 // all other HTML tags
    .replace(/&nbsp;/g, ' ')                 // nbsp entities
    .replace(/&amp;/g, '&')                  // amp entities
    .replace(/&lt;/g, '<')                   // lt entities
    .replace(/&gt;/g, '>')                   // gt entities
    .replace(/\n{3,}/g, '\n\n')              // max 2 newlines in a row
    .trim();
}

// Generate a random OTP code in format PL-XXXX-XX
function generateOTPCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars (0,O,1,I)
  let code = 'PL-';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Nieautoryzowany dostęp' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { reflink_id } = await req.json();
    if (!reflink_id) {
      return new Response(
        JSON.stringify({ error: 'Brak reflink_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get reflink details
    const { data: reflink, error: reflinkError } = await supabaseAdmin
      .from('reflinks')
      .select('*')
      .eq('id', reflink_id)
      .single();

    if (reflinkError || !reflink) {
      console.error('Reflink error:', reflinkError);
      return new Response(
        JSON.stringify({ error: 'Nie znaleziono InfoLinku' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if reflink requires OTP
    if (!reflink.requires_otp) {
      return new Response(
        JSON.stringify({ error: 'Ten link nie wymaga kodu OTP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique OTP code (retry if collision)
    let otpCode: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      otpCode = generateOTPCode();
      const { data: existing } = await supabaseAdmin
        .from('infolink_otp_codes')
        .select('id')
        .eq('code', otpCode)
        .single();
      
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: 'Nie udało się wygenerować unikalnego kodu' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiry time
    const validityHours = reflink.otp_validity_hours || 24;
    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

    // Insert OTP code
    const { data: otpRecord, error: insertError } = await supabaseAdmin
      .from('infolink_otp_codes')
      .insert({
        reflink_id: reflink_id,
        partner_id: user.id,
        code: otpCode,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert OTP error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Błąd podczas tworzenia kodu OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the InfoLink URL
    const baseUrl = req.headers.get('origin') || 'https://purelife.lovable.app';
    const infolinkUrl = `${baseUrl}/infolink/${reflink.slug || reflink.id}`;

    // Format the message for clipboard - strip HTML tags for plain text
    const welcomeMessage = stripHtml(reflink.welcome_message || 'Witaj! Przesyłam Ci link do materiałów informacyjnych:');
    const validityText = validityHours === 1 
      ? '1 godzinę' 
      : validityHours < 5 
        ? `${validityHours} godziny` 
        : `${validityHours} godzin`;

    const clipboardMessage = `${welcomeMessage}

${infolinkUrl}

Kod dostępu: ${otpCode}
Kod jest ważny przez ${validityText}.`;

    console.log(`Generated OTP ${otpCode} for reflink ${reflink_id} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        validity_hours: validityHours,
        clipboard_message: clipboardMessage,
        infolink_url: infolinkUrl,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-infolink-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił błąd serwera' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
