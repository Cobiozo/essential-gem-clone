// Daily CRON: permanently delete accounts whose deletion_scheduled_at has passed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { stampAccountDeletionOnTickets } from '../_shared/account-deletion-stamp.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const now = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, first_name, last_name, email, deletion_requested_at, deletion_scheduled_at')
    .eq('deletion_status', 'pending')
    .lte('deletion_scheduled_at', now);

  if (error) {
    console.error('[cron-purge] fetch error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const results: any[] = [];

  for (const row of (due || []) as any[]) {
    const userId = row.user_id;
    const email = row.email;
    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || email || userId;
    const actedAt = new Date().toISOString();

    try {
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
        requested_at: row.deletion_requested_at ?? actedAt,
        final_action: 'auto_deleted', acted_by: null, acted_at: actedAt,
        notes: 'CRON purge after 30-day window',
      } as any);

      results.push({ userId, ok: true });
    } catch (e: any) {
      console.error('[cron-purge] failed for', userId, e);
      results.push({ userId, ok: false, error: e?.message });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
