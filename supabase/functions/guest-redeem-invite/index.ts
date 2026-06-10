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

const MESSAGES: Record<string, string> = {
  invalid_input: 'Uzupełnij wszystkie pola: imię, prawidłowy adres e-mail oraz hasło (min. 8 znaków).',
  invalid_email: 'Podany adres e-mail jest nieprawidłowy.',
  password_too_short: 'Hasło musi mieć co najmniej 8 znaków.',
  missing_first_name: 'Podaj swoje imię.',
  missing_token: 'Brak tokenu zaproszenia w linku.',
  email_exists: 'Konto z tym adresem e-mail już istnieje. Zaloguj się lub użyj innego adresu.',
  expired: 'Ten link zaproszenia wygasł. Poproś o nowy.',
  exhausted: 'Limit użyć tego linku zaproszenia został wyczerpany.',
  inactive: 'Ten link zaproszenia został wyłączony przez administratora.',
  not_found: 'Nie znaleziono takiego linku zaproszenia.',
  invalid_token: 'Link zaproszenia jest nieprawidłowy.',
  token_consumed_or_invalid: 'Ten link zaproszenia został już wykorzystany.',
  resolve_failed: 'Nie udało się zweryfikować linku zaproszenia. Spróbuj ponownie za chwilę.',
  create_failed: 'Nie udało się utworzyć konta. Spróbuj ponownie.',
  profile_upsert_failed: 'Nie udało się utworzyć profilu gościa. Spróbuj ponownie za chwilę.',
  method_not_allowed: 'Nieprawidłowe żądanie.',
  unknown: 'Rejestracja nieudana. Spróbuj ponownie lub skontaktuj się z administratorem.',
};

const fail = (status: number, code: string, detail?: string) =>
  new Response(
    JSON.stringify({
      error: code,
      code,
      message: MESSAGES[code] || MESSAGES.unknown,
      detail,
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );

const ok = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed');

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = String(body.token || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const first_name = String(body.first_name || '').trim().slice(0, 60);
    const last_name = String(body.last_name || '').trim().slice(0, 60);

    if (!token) return fail(400, 'missing_token');
    if (!first_name) return fail(400, 'missing_first_name');
    if (!email || !EMAIL_RE.test(email)) return fail(400, 'invalid_email');
    if (password.length < 8) return fail(400, 'password_too_short');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1. Validate token
    const { data: resolved, error: resolveErr } = await admin
      .rpc('resolve_guest_invite', { _token: token });
    if (resolveErr) {
      console.error('resolve_guest_invite error', resolveErr);
      return fail(500, 'resolve_failed', resolveErr.message);
    }
    const inviteRow = Array.isArray(resolved) ? resolved[0] : resolved;
    if (!inviteRow?.is_valid) {
      const reason = inviteRow?.reason || 'invalid_token';
      const known = ['expired', 'exhausted', 'inactive', 'not_found', 'invalid_token'].includes(reason)
        ? reason
        : 'invalid_token';
      return fail(400, known);
    }

    // 2. Create auth user (email NOT confirmed)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { first_name, last_name, is_guest: true },
    });
    if (createErr || !created?.user) {
      const msg = String(createErr?.message || 'create_failed').toLowerCase();
      console.error('createUser failed', createErr?.message);
      if (msg.includes('already') || msg.includes('exist') || msg.includes('registered')) {
        return fail(400, 'email_exists', createErr?.message);
      }
      return fail(400, 'create_failed', createErr?.message);
    }
    const userId = created.user.id;

    // 3. Upsert profile — BLOCKED state: must confirm email AND wait for admin approval
    const nowIso = new Date().toISOString();
    const { error: profErr } = await admin.from('profiles').upsert({
      id: userId,
      user_id: userId,
      email,
      first_name,
      last_name: last_name || null,
      is_active: true,             // technically active, but blocked by admin_approved/email_activated gate

      profile_completed: true,
      guardian_approved: true,     // admin acts as guardian for guests
      guardian_approved_at: nowIso,
      admin_approved: false,       // requires explicit admin approval
      admin_approved_at: null,
      accepted_terms: true,
      accepted_privacy: true,
      accepted_rodo: true,
      accepted_terms_at: nowIso,
      email_activated: false,      // requires email confirmation via activate-email
      email_activated_at: null,
    }, { onConflict: 'user_id' });
    if (profErr) {
      console.error('profile upsert failed', profErr);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return fail(500, 'profile_upsert_failed', profErr.message);
    }

    // 4. Remove default role auto-assigned by trigger
    await admin.from('user_roles').delete().eq('user_id', userId);

    // 5. Atomically consume token + assign role
    const { data: consumed, error: consumeErr } = await admin
      .rpc('consume_guest_invite', { _token: token, _user_id: userId });
    if (consumeErr || consumed === false) {
      console.error('consume_guest_invite failed', consumeErr);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return fail(400, 'token_consumed_or_invalid', consumeErr?.message);
    }

    // 6. Send activation email
    try {
      await admin.functions.invoke('send-activation-email', {
        body: { userId, email, firstName: first_name, lastName: last_name, role: 'guest' },
      });
    } catch (mailErr) {
      console.error('send-activation-email failed (non-fatal)', mailErr);
    }

    return ok({ ok: true, user_id: userId, requires_email_confirmation: true });
  } catch (e) {
    console.error('guest-redeem-invite error', e);
    return fail(500, 'unknown', String((e as Error).message || e));
  }
});
