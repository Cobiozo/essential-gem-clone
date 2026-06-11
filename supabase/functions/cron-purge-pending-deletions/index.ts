// Daily CRON: permanently delete accounts whose deletion_scheduled_at has passed.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { sendMail, brandedEmailLayout } from '../_shared/smtp.ts';
import { stampAccountDeletionOnTickets, stampInviterAccountDeletion } from '../_shared/account-deletion-stamp.ts';


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
    const greetingName = row.first_name || fullName || email || '';
    const actedAt = new Date().toISOString();

    try {
      const { data: rolesRows } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
      const rolesList: string[] = ((rolesRows || []) as any[]).map((r) => r.role).filter(Boolean);
      const snapshot = { first_name: row.first_name, last_name: row.last_name, email, roles: rolesList };

      await stampInviterAccountDeletion(supabaseAdmin, userId, { action: 'auto_deleted', snapshot });
      await stampAccountDeletionOnTickets(supabaseAdmin, userId, email, { action: 'auto_deleted', snapshot });

      await supabaseAdmin.from('team_contacts').update({ linked_user_deleted_at: actedAt }).eq('linked_user_id', userId);

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (delErr) throw delErr;

      const { data: logRow } = await supabaseAdmin.from('account_deletion_log').insert({
        user_id: userId, email_snapshot: email, full_name_snapshot: fullName,
        requested_at: row.deletion_requested_at ?? actedAt,
        final_action: 'auto_deleted', acted_by: null, acted_at: actedAt,
        notes: 'CRON purge after 30-day window',
      } as any).select('id').maybeSingle();

      // Notify user that the 30-day window elapsed and the account is gone.
      if (email) {
        let mailStatus = 'sent';
        let mailErr: string | null = null;
        const html = brandedEmailLayout('Twoje konto zostało trwale usunięte', `
          <p>Cześć ${greetingName},</p>
          <p>Minęło 30 dni od Twojego zgłoszenia usunięcia konta w Pure Life Center. Zgodnie z polityką platformy Twoje konto zostało właśnie automatycznie i trwale usunięte.</p>
          <p>Wszystkie dane osobowe zostały skasowane. Historyczne rejestracje i bilety mogą pozostać w systemie z oznaczeniem „konto usunięte" wyłącznie w celach księgowych i statystycznych.</p>
          <p>Jeśli to nie Ty wnioskowałeś o usunięcie konta, skontaktuj się natychmiast z administracją.</p>
        `);
        try {
          const r = await sendMail({ to: email, subject: 'Pure Life Center — konto trwale usunięte', html });
          if (!r.success) { mailStatus = 'failed'; mailErr = r.error || 'unknown error'; }
        } catch (e: any) {
          mailStatus = 'failed'; mailErr = e?.message || String(e);
        }
        if ((logRow as any)?.id) {
          await supabaseAdmin.from('account_deletion_log').update({
            user_email_sent_at: new Date().toISOString(),
            user_email_status: mailStatus,
            user_email_error: mailErr,
          }).eq('id', (logRow as any).id);
        }
      }

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
