// Admin finalizes an account-deletion request.
// Body: { userId: string, action: 'restore'|'anonymize'|'delete' }
// - restore: clears deletion fields, reactivates account, emails user.
// - anonymize: keeps row but scrubs PII; account stays disabled.
// - delete: full purge (anonymize FK refs + auth.admin.deleteUser).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { sendMail, brandedEmailLayout } from '../_shared/smtp.ts';
import { stampAccountDeletionOnTickets } from '../_shared/account-deletion-stamp.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'restore' | 'anonymize' | 'delete';

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

      await supabaseAdmin.from('account_deletion_log').insert({
        user_id: userId, email_snapshot: email, full_name_snapshot: fullName,
        requested_at: (profile as any)?.deletion_requested_at ?? actedAt,
        final_action: 'restored', acted_by: user.id, acted_at: actedAt,
        notes: 'Admin restored account',
      } as any);

      if (email) {
        const html = brandedEmailLayout('Twoje konto zostało przywrócone', `
          <p>Cześć ${fullName.split(' ')[0] || ''},</p>
          <p>Administrator Pure Life Center przywrócił Twoje konto. Możesz ponownie się zalogować i korzystać z platformy.</p>
          <p>Jeśli to nie Ty wnioskowałeś o przywrócenie, skontaktuj się z nami niezwłocznie.</p>
        `);
        await sendMail({ to: email, subject: 'Pure Life Center — konto przywrócone', html });
      }

      return new Response(JSON.stringify({ success: true, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'anonymize') {
      const anonEmail = `deleted-${userId}@anonymized.local`;
      const { error } = await supabaseAdmin.from('profiles').update({
        first_name: 'Konto', last_name: 'usunięte',
        email: anonEmail, phone: null, avatar_url: null,
        deletion_status: 'anonymized', deletion_scheduled_at: null,
        is_active: false,
      }).eq('user_id', userId);
      if (error) throw error;

      // Stamp tickets/registrations so admin & verification still see them, with note.
      await stampAccountDeletionOnTickets(supabaseAdmin, userId, email, {
        action: 'anonymized', snapshot,
      });

      await supabaseAdmin.from('account_deletion_log').insert({
        user_id: userId, email_snapshot: email, full_name_snapshot: fullName,
        requested_at: (profile as any)?.deletion_requested_at ?? actedAt,
        final_action: 'anonymized', acted_by: user.id, acted_at: actedAt,
        notes: 'Admin anonymized account',
      } as any);

      return new Response(JSON.stringify({ success: true, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // action === 'delete'
    // Anonymize FK refs (same logic as admin-delete-user).
    await supabaseAdmin.from('team_contacts').update({ linked_user_deleted_at: actedAt }).eq('linked_user_id', userId);
    await Promise.allSettled([
      supabaseAdmin.from('event_form_submissions').update({ partner_user_id: null }).eq('partner_user_id', userId),
      supabaseAdmin.from('paid_event_orders').update({ user_id: null }).eq('user_id', userId),
      supabaseAdmin.from('guest_event_registrations').update({ invited_by_user_id: null }).eq('invited_by_user_id', userId),
      supabaseAdmin.from('user_reflinks').update({ creator_user_id: null }).eq('creator_user_id', userId),
      supabaseAdmin.from('guest_invite_links').update({ created_by: null }).eq('created_by', userId),
    ]);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw delErr;

    await supabaseAdmin.from('account_deletion_log').insert({
      user_id: userId, email_snapshot: email, full_name_snapshot: fullName,
      requested_at: (profile as any)?.deletion_requested_at ?? actedAt,
      final_action: 'deleted', acted_by: user.id, acted_at: actedAt,
      notes: 'Admin permanently deleted account',
    } as any);

    return new Response(JSON.stringify({ success: true, action }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[admin-finalize-account-deletion] error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
