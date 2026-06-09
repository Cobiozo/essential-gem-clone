// Guest invite redemption: creates auth user and assigns 'guest' role atomically.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  token?: string;
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const token = String(body.token || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const first_name = String(body.first_name || '').trim().slice(0, 60);
    const last_name = String(body.last_name || '').trim().slice(0, 60);

    if (!token || !email || !password || password.length < 8 || !first_name) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1. Validate token
    const { data: resolved, error: resolveErr } = await admin
      .rpc('resolve_guest_invite', { _token: token });
    if (resolveErr) throw resolveErr;
    const inviteRow = Array.isArray(resolved) ? resolved[0] : resolved;
    if (!inviteRow?.is_valid) {
      return new Response(JSON.stringify({ error: inviteRow?.reason || 'invalid_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create auth user (email auto-confirmed for guests)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, is_guest: true },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || 'create_failed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = created.user.id;

    // 3. Upsert profile (minimal)
    await admin.from('profiles').upsert({
      id: userId,
      email,
      first_name,
      last_name,
      role: 'guest',
    }, { onConflict: 'id' });

    // 4. Atomically consume token + assign role
    const { data: consumed, error: consumeErr } = await admin
      .rpc('consume_guest_invite', { _token: token, _user_id: userId });
    if (consumeErr || consumed === false) {
      // Roll back user
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return new Response(JSON.stringify({ error: 'token_consumed_or_invalid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('guest-redeem-invite error', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
