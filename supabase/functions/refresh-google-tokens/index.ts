import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[refresh-google-tokens] ========== CRON Start ==========');

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[refresh-google-tokens] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
      return new Response(
        JSON.stringify({ error: 'Missing Google OAuth credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Find tokens expiring in the next 15 minutes
    const fifteenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    
    const { data: expiringTokens, error: fetchError } = await supabase
      .from('user_google_tokens')
      .select('user_id, refresh_token, expires_at, refresh_fail_count, google_email')
      .lt('expires_at', fifteenMinutesFromNow)
      .not('refresh_token', 'is', null);

    if (fetchError) {
      console.error('[refresh-google-tokens] Failed to fetch tokens:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiringTokens || expiringTokens.length === 0) {
      console.log('[refresh-google-tokens] No tokens need refreshing');
      return new Response(
        JSON.stringify({ refreshed: 0, failed: 0, removed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[refresh-google-tokens] Found ${expiringTokens.length} tokens to refresh`);

    let refreshed = 0;
    let failed = 0;
    let removed = 0;

    for (const token of expiringTokens) {
      try {
        console.log(`[refresh-google-tokens] Refreshing token for user: ${token.user_id} (${token.google_email || 'no email'})`);

        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: token.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (response.ok) {
          const tokenData = await response.json();
          const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

          await supabase
            .from('user_google_tokens')
            .update({
              access_token: tokenData.access_token,
              expires_at: newExpiresAt,
              refresh_fail_count: 0, // Reset on success
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', token.user_id);

          console.log(`[refresh-google-tokens] ✓ Token refreshed for user: ${token.user_id}, expires: ${newExpiresAt}`);
          refreshed++;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'unknown' }));
          console.error(`[refresh-google-tokens] ✗ Refresh failed for user: ${token.user_id}`, errorData);

          if (errorData.error === 'invalid_grant') {
            const currentFailCount = token.refresh_fail_count || 0;

            if (currentFailCount >= 2) {
              // 3rd consecutive failure → remove token + notify user
              console.log(`[refresh-google-tokens] 3 consecutive invalid_grant failures, removing token for user: ${token.user_id}`);
              
              await supabase
                .from('user_google_tokens')
                .delete()
                .eq('user_id', token.user_id);

              // Create in-app notification
              await supabase.from('user_notifications').insert({
                user_id: token.user_id,
                notification_type: 'google_calendar_disconnected',
                source_module: 'google_calendar',
                title: 'Google Calendar rozłączony',
                message: 'Połączenie z Google Calendar zostało utracone po wielokrotnych nieudanych próbach odświeżenia tokena. Połącz ponownie w zakładce Moje Konto.',
                link: '/my-account',
              });

              removed++;
            } else {
              // Increment fail count
              console.log(`[refresh-google-tokens] Incrementing refresh_fail_count to ${currentFailCount + 1} for user: ${token.user_id}`);
              
              await supabase
                .from('user_google_tokens')
                .update({
                  refresh_fail_count: currentFailCount + 1,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', token.user_id);

              failed++;
            }
          } else {
            // Non-invalid_grant error (network issue, etc.) - don't increment counter
            console.log(`[refresh-google-tokens] Non-fatal error for user: ${token.user_id}, error: ${errorData.error}`);
            failed++;
          }
        }
      } catch (tokenError) {
        console.error(`[refresh-google-tokens] Exception refreshing token for user: ${token.user_id}`, tokenError);
        failed++;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[refresh-google-tokens] ========== CRON Complete (${elapsed}ms) ==========`);
    console.log(`[refresh-google-tokens] Results: refreshed=${refreshed}, failed=${failed}, removed=${removed}`);

    return new Response(
      JSON.stringify({ refreshed, failed, removed, elapsed_ms: elapsed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[refresh-google-tokens] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', message: error instanceof Error ? error.message : 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
