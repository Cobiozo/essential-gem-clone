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

const jsonResp = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResp(405, { error: 'method_not_allowed' });

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = String(body.token || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const first_name = String(body.first_name || '').trim().slice(0, 60);
    const last_name = String(body.last_name || '').trim().slice(0, 60);

    if (!token || !email || !password || password.length < 8 || !first_name) {
      return jsonResp(400, { error: 'invalid_input' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1. Validate token
    const { data: resolved, error: resolveErr } = await admin
      .rpc('resolve_guest_invite', { _token: token });
    if (resolveErr) {
      console.error('resolve_guest_invite error', resolveErr);
      return jsonResp(500, { error: 'resolve_failed', detail: resolveErr.message });
    }
    const inviteRow = Array.isArray(resolved) ? resolved[0] : resolved;
    if (!inviteRow?.is_valid) {
      return jsonResp(400, { error: inviteRow?.reason || 'invalid_token' });
    }

    // 2. Create auth user (email NOT confirmed — guest must click activation link)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { first_name, last_name, is_guest: true },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message || 'create_failed';
      console.error('createUser failed', msg);
      return jsonResp(400, { error: msg });
    }
    const userId = created.user.id;

    // 3. Upsert profile — guest is approved/complete but email_activated stays false until they click the link
    const nowIso = new Date().toISOString();
    const { error: profErr } = await admin.from('profiles').upsert({
      id: userId,
      user_id: userId,
      email,
      first_name,
      last_name: last_name || null,
      role: 'guest',
      is_active: true,
      profile_completed: true,
      guardian_approved: true,
      guardian_approved_at: nowIso,
      admin_approved: true,
      admin_approved_at: nowIso,
      accepted_terms: true,
      accepted_privacy: true,
      accepted_rodo: true,
      accepted_terms_at: nowIso,
      email_activated: false,
      email_activated_at: null,
    }, { onConflict: 'id' });
    if (profErr) {
      console.error('profile upsert failed', profErr);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return jsonResp(500, { error: 'profile_upsert_failed', detail: profErr.message });
    }

    // 4. Remove any default role auto-assigned by trigger (e.g. 'user') so guest is the only role
    await admin.from('user_roles').delete().eq('user_id', userId);

    // 5. Atomically consume token + assign role
    const { data: consumed, error: consumeErr } = await admin
      .rpc('consume_guest_invite', { _token: token, _user_id: userId });
    if (consumeErr || consumed === false) {
      console.error('consume_guest_invite failed', consumeErr);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return jsonResp(400, { error: 'token_consumed_or_invalid', detail: consumeErr?.message });
    }

    // 6. Send activation email (link confirms Supabase auth + sets email_activated via activate-email function)
    try {
      await admin.functions.invoke('send-activation-email', {
        body: {
          userId,
          email,
          firstName: first_name,
          lastName: last_name,
          role: 'guest',
        },
      });
    } catch (mailErr) {
      console.error('send-activation-email failed (non-fatal)', mailErr);
    }

    return jsonResp(200, { ok: true, user_id: userId, requires_email_confirmation: true });
  } catch (e) {
    console.error('guest-redeem-invite error', e);
    return jsonResp(500, { error: String((e as Error).message || e) });
  }
});
