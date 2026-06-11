// Admin finalizes an account-deletion request.
// Body: { userId: string, action: 'restore'|'anonymize'|'delete' }
// - restore: clears deletion fields, reactivates account, emails user.
// - anonymize: keeps row but scrubs PII; account stays disabled.
// - delete: full purge (snapshot inviter refs + auth.admin.deleteUser).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { sendMail, brandedEmailLayout } from '../_shared/smtp.ts';
import { stampAccountDeletionOnTickets, stampInviterAccountDeletion } from '../_shared/account-deletion-stamp.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'restore' | 'anonymize' | 'delete';

async function sendUserNotice(
  supabaseAdmin: any,
  logId: string | null,
  to: string | null,
  subject: string,
  html: string,
) {
  if (!to) return;
  let status = 'sent';
  let errorMsg: string | null = null;
  try {
    const r = await sendMail({ to, subject, html });
    if (!r.success) {
      status = 'failed';
      errorMsg = r.error || 'unknown error';
      console.warn('[admin-finalize] user mail failed', to, r.error);
    }
  } catch (e: any) {
    status = 'failed';
    errorMsg = e?.message || String(e);
    console.warn('[admin-finalize] user mail exception', e);
  }
  if (logId) {
    try {
      await supabaseAdmin.from('account_deletion_log').update({
        user_email_sent_at: new Date().toISOString(),
        user_email_status: status,
        user_email_error: errorMsg,
      }).eq('id', logId);
    } catch (e) { console.warn('[admin-finalize] log update failed', e); }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Admin check
    const { data: roleRow } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: 'Access denied: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.userId;
    const action: Action | undefined = body?.action;
    if (!userId || !action || !['restore', 'anonymize', 'delete'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid body: { userId, action }' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (userId === user.id) return new Response(JSON.stringify({ error: 'Cannot act on your own account' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, first_name, last_name, email, deletion_status, deletion_requested_at')
      .eq('user_id', userId)
      .maybeSingle();
    const email = (profile as any)?.email ?? null;
    const fullName = [(profile as any)?.first_name, (profile as any)?.last_name].filter(Boolean).join(' ').trim() || (email ?? userId);
    const greetingName = (profile as any)?.first_name || fullName || email || '';

    const { data: rolesRows } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
    const rolesList: string[] = ((rolesRows || []) as any[]).map((r) => r.role).filter(Boolean);
    const snapshot = {
      first_name: (profile as any)?.first_name ?? null,
      last_name: (profile as any)?.last_name ?? null,
      email,
      roles: rolesList,
    };

    const actedAt = new Date().toISOString();

    if (action === 'restore') {
      const { error } = await supabaseAdmin.from('profiles').update({
        deletion_status: null,
        deletion_requested_at: null,
        deletion_scheduled_at: null,
        is_active: true,
      }).eq('user_id', userId);
      if (error) throw error;

      const { data: logRow } = await supabaseAdmin.from('account_deletion_log').insert({
        user_id: userId, email_snapshot: email, full_name_snapshot: fullName,
        requested_at: (profile as any)?.deletion_requested_at ?? actedAt,
        final_action: 'restored', acted_by: user.id, acted_at: actedAt,
        notes: 'Admin restored account',
      } as any).select('id').maybeSingle();

      const html = brandedEmailLayout('Twoje konto zostało przywrócone', `
        <p>Cześć ${greetingName},</p>
        <p>Administrator Pure Life Center przywrócił Twoje konto. Możesz ponownie się zalogować i korzystać z platformy.</p>
        <p>Jeśli to nie Ty wnioskowałeś o przywrócenie, skontaktuj się z nami niezwłocznie.</p>
      `);
      await sendUserNotice(supabaseAdmin, (logRow as any)?.id ?? null, email, 'Pure Life Center — konto przywrócone', html);

      return new Response(JSON.stringify({ success: true, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'anonymize') {
      // Preserve inviter/creator references BEFORE we touch the profile.
      await stampInviterAccountDeletion(supabaseAdmin, userId, { action: 'anonymized', snapshot });

      const anonEmail = `deleted-${userId}@anonymized.local`;
      const { error } = await supabaseAdmin.from('profiles').update({
        first_name: 'Konto', last_name: 'usunięte',
        email: anonEmail, phone: null, avatar_url: null,
        deletion_status: 'anonymized', deletion_scheduled_at: null,
        is_active: false,
      }).eq('user_id', userId);
      if (error) throw error;

      await stampAccountDeletionOnTickets(supabaseAdmin, userId, email, {
        action: 'anonymized', snapshot,
      });

      const { data: logRow } = await supabaseAdmin.from('account_deletion_log').insert({
        user_id: userId, email_snapshot: email, full_name_snapshot: fullName,
        requested_at: (profile as any)?.deletion_requested_at ?? actedAt,
        final_action: 'anonymized', acted_by: user.id, acted_at: actedAt,
        notes: 'Admin anonymized account',
      } as any).select('id').maybeSingle();

      const html = brandedEmailLayout('Twoje konto zostało zanonimizowane', `
        <p>Cześć ${greetingName},</p>
        <p>Informujemy, że Twoje konto w Pure Life Center zostało zanonimizowane na podstawie wcześniejszego zgłoszenia usunięcia.</p>
        <p>Twoje dane osobowe (imię, nazwisko, e-mail, telefon, avatar) zostały usunięte z naszej bazy. Powiązane rejestracje i bilety pozostają w systemie wyłącznie z oznaczeniem „konto usunięte" — w celach księgowych i statystycznych.</p>
        <p>Jeśli to nie Ty wnioskowałeś o usunięcie konta, skontaktuj się z administracją.</p>
      `);
      await sendUserNotice(supabaseAdmin, (logRow as any)?.id ?? null, email, 'Pure Life Center — konto zanonimizowane', html);

      return new Response(JSON.stringify({ success: true, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // action === 'delete'
    // Preserve inviter/creator info BEFORE the cascade runs.
    await stampInviterAccountDeletion(supabaseAdmin, userId, { action: 'deleted', snapshot });
    await stampAccountDeletionOnTickets(supabaseAdmin, userId, email, { action: 'deleted', snapshot });

    // Team contacts marker (kept).
    await supabaseAdmin.from('team_contacts').update({ linked_user_deleted_at: actedAt }).eq('linked_user_id', userId);

    // NOTE: we intentionally NO LONGER null invited_by_user_id / partner_user_id
    // / created_by here — snapshots above preserve the display info; for hard
    // delete, the ON DELETE SET NULL on profiles will null FKs automatically.

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    const { data: logRow } = await supabaseAdmin.from('account_deletion_log').insert({
      user_id: userId, email_snapshot: email, full_name_snapshot: fullName,
      requested_at: (profile as any)?.deletion_requested_at ?? actedAt,
      final_action: 'deleted', acted_by: user.id, acted_at: actedAt,
      notes: 'Admin permanently deleted account',
    } as any).select('id').maybeSingle();

    const html = brandedEmailLayout('Twoje konto zostało trwale usunięte', `
      <p>Cześć ${greetingName},</p>
      <p>Informujemy, że Twoje konto w Pure Life Center zostało trwale usunięte na podstawie wcześniejszego zgłoszenia.</p>
      <p>Wszystkie powiązane dane osobowe zostały skasowane. Historyczne rejestracje i bilety mogą pozostać w systemie z oznaczeniem „konto usunięte" wyłącznie w celach księgowych i statystycznych.</p>
      <p>Jeśli to nie Ty wnioskowałeś o usunięcie konta, skontaktuj się natychmiast z administracją.</p>
    `);
    await sendUserNotice(supabaseAdmin, (logRow as any)?.id ?? null, email, 'Pure Life Center — konto usunięte', html);

    return new Response(JSON.stringify({ success: true, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[admin-finalize-account-deletion] error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
