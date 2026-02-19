import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { oldEndpoint, newEndpoint, p256dh, auth } = await req.json();

    if (!oldEndpoint || !newEndpoint || !p256dh || !auth) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: oldEndpoint, newEndpoint, p256dh, auth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key — SW doesn't have user JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find existing subscription by old endpoint
    const { data: existing, error: findError } = await supabase
      .from('user_push_subscriptions')
      .select('id, user_id, browser, os, device_type, is_pwa')
      .eq('endpoint', oldEndpoint)
      .single();

    if (findError || !existing) {
      console.warn('[renew-push-subscription] Old endpoint not found:', oldEndpoint.substring(0, 60));
      // If old endpoint not found, can't renew — subscription might have been manually deleted
      return new Response(
        JSON.stringify({ success: false, reason: 'old_endpoint_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if new endpoint already exists (avoid duplicate)
    const { data: duplicate } = await supabase
      .from('user_push_subscriptions')
      .select('id')
      .eq('endpoint', newEndpoint)
      .single();

    if (duplicate) {
      // New endpoint already registered — delete old record and keep new
      await supabase
        .from('user_push_subscriptions')
        .delete()
        .eq('id', existing.id);

      console.log('[renew-push-subscription] New endpoint already exists, removed old duplicate');
      return new Response(
        JSON.stringify({ success: true, action: 'deduplicated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update subscription with new endpoint and keys
    const { error: updateError } = await supabase
      .from('user_push_subscriptions')
      .update({
        endpoint: newEndpoint,
        p256dh,
        auth,
        last_used_at: new Date().toISOString(),
        failure_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[renew-push-subscription] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[renew-push-subscription] Successfully renewed subscription for user ${existing.user_id} (${existing.browser}/${existing.os})`);

    return new Response(
      JSON.stringify({ success: true, action: 'renewed', userId: existing.user_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[renew-push-subscription] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
