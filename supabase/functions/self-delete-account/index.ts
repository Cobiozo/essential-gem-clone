// Self soft-delete account (30-day window).
// - Marks the profile as pending_deletion + is_active=false
// - Records a pending entry in account_deletion_log
// - Notifies all admins (in-app notification + email)
// - Does NOT remove auth user or anonymize data; that happens later
//   via admin-finalize-account-deletion or cron-purge-pending-deletions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { sendMail, brandedEmailLayout } from '../_shared/smtp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAYS_UNTIL_PURGE = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    // Block admins from soft-deleting themselves through this endpoint.
    const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
    const rolesArr = (roles || []) as Array<{ role: string }>;
    if (rolesArr.some(r => r.role === 'admin')) {
      return new Response(JSON.stringify({
        error: 'Konto administratora może usunąć wyłącznie inny administrator.',
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load profile snapshot for email/log
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email, deletion_status')
      .eq('user_id', userId)
      .maybeSingle();

    // Idempotency: if already pending, just return success.
    if (profile && (profile as any).deletion_status === 'pending') {
      return new Response(JSON.stringify({ success: true, alreadyPending: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const scheduled = new Date(now.getTime() + DAYS_UNTIL_PURGE * 86400000);
    const requestedAt = now.toISOString();
    const scheduledAt = scheduled.toISOString();
    const email = (profile as any)?.email ?? user.email ?? null;
    const fullName = [(profile as any)?.first_name, (profile as any)?.last_name].filter(Boolean).join(' ').trim() || (email ?? userId);

    // 1) Mark profile as pending deletion + deactivate.
    const { error: upErr } = await supabaseAdmin
      .from('profiles')
      .update({
        deletion_status: 'pending',
        deletion_requested_at: requestedAt,
        deletion_scheduled_at: scheduledAt,
        is_active: false,
      })
      .eq('user_id', userId);
    if (upErr) console.warn('[self-delete-account] profile update failed', upErr);

    // 2) Audit log entry (pending).
    try {
      await supabaseAdmin.from('account_deletion_log').insert({
        user_id: userId,
        email_snapshot: email,
        full_name_snapshot: fullName,
        roles_snapshot: rolesArr,
        requested_at: requestedAt,
        scheduled_at: scheduledAt,
        final_action: null,
        notes: 'Self-requested deletion',
      } as any);
    } catch (e) { console.warn('[self-delete-account] deletion log insert failed', e); }

    try {
      await supabaseAdmin.from('admin_activity_log').insert({
        admin_user_id: userId,
        action_type: 'self_account_deletion_requested',
        action_description: `Użytkownik ${email ?? userId} zgłosił usunięcie konta. Trwałe usunięcie zaplanowano na ${scheduled.toISOString().slice(0,10)}.`,
        target_table: 'auth.users',
        target_id: userId,
        details: { scheduled_at: scheduledAt, roles: rolesArr.map(r => r.role) },
      } as any);
    } catch (e) { console.warn('[self-delete-account] admin activity log failed', e); }

    // 3) Notify all admins — in-app notifications + email.
    const { data: admins } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    const adminIds: string[] = (admins || []).map((a: any) => a.user_id).filter(Boolean);

    if (adminIds.length) {
      const link = '/admin?tab=deleted-accounts';
      const title = 'Wniosek o usunięcie konta';
      const message = `${fullName} (${email ?? 'brak e-mail'}) zgłosił usunięcie konta. Trwałe usunięcie zaplanowano na ${scheduled.toISOString().slice(0, 10)}.`;
      const rows = adminIds.map((id) => ({
        user_id: id,
        sender_id: userId,
        notification_type: 'account_deletion_requested',
        source_module: 'admin',
        title,
        message,
        link,
        metadata: { deleted_user_id: userId, scheduled_at: scheduledAt },
      }));
      try { await supabaseAdmin.from('user_notifications').insert(rows); }
      catch (e) { console.warn('[self-delete-account] notifications insert failed', e); }

      // Fetch admin emails
      const { data: adminProfiles } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .in('user_id', adminIds);
      const adminEmails = ((adminProfiles || []) as any[]).map(p => p.email).filter(Boolean);

      if (adminEmails.length) {
        const html = brandedEmailLayout('Wniosek o usunięcie konta', `
          <p>Użytkownik zgłosił chęć usunięcia swojego konta na Pure Life Center.</p>
          <p><strong>Imię i nazwisko:</strong> ${fullName}<br/>
             <strong>E-mail:</strong> ${email ?? '—'}<br/>
             <strong>Role:</strong> ${rolesArr.map(r => r.role).join(', ') || '—'}<br/>
             <strong>Data zgłoszenia:</strong> ${now.toISOString().slice(0,16).replace('T',' ')} UTC<br/>
             <strong>Trwałe usunięcie:</strong> ${scheduled.toISOString().slice(0,10)} (za ${DAYS_UNTIL_PURGE} dni)</p>
          <p>W ciągu ${DAYS_UNTIL_PURGE} dni możesz przywrócić konto, zanonimizować dane lub usunąć je natychmiast w panelu administracyjnym → Użytkownicy → <em>Usunięte konta</em>.</p>
          <p>Po upływie tego terminu konto zostanie automatycznie i trwale usunięte.</p>
        `);
        // Send sequentially to avoid SMTP rate limits.
        for (const to of adminEmails) {
          const r = await sendMail({ to, subject: 'Pure Life Center — wniosek o usunięcie konta', html });
          if (!r.success) console.warn('[self-delete-account] admin mail failed', to, r.error);
        }
      }
    }

    // 4) Confirmation email to the user themselves.
    if (email) {
      try {
        const greetingName = (profile as any)?.first_name || fullName || email;
        const userHtml = brandedEmailLayout('Potwierdzenie zgłoszenia usunięcia konta', `
          <p>Cześć ${greetingName},</p>
          <p>Otrzymaliśmy zgłoszenie usunięcia Twojego konta w Pure Life Center.</p>
          <p><strong>Data zgłoszenia:</strong> ${now.toISOString().slice(0,16).replace('T',' ')} UTC<br/>
             <strong>Trwałe usunięcie zaplanowano na:</strong> ${scheduled.toISOString().slice(0,10)} (za ${DAYS_UNTIL_PURGE} dni)</p>
          <p>Przez najbliższe ${DAYS_UNTIL_PURGE} dni możesz cofnąć tę decyzję — skontaktuj się z administracją, aby przywrócić konto. Po tym terminie konto i wszystkie powiązane dane zostaną nieodwracalnie usunięte.</p>
          <p><strong>Jeśli to nie Ty zgłosiłeś usunięcie konta</strong>, natychmiast zmień hasło i skontaktuj się z administracją.</p>
        `);
        const r = await sendMail({
          to: email,
          subject: 'Pure Life Center — potwierdzenie zgłoszenia usunięcia konta',
          html: userHtml,
        });
        if (!r.success) console.warn('[self-delete-account] user confirmation mail failed', email, r.error);
      } catch (e) {
        console.warn('[self-delete-account] user confirmation mail exception', e);
      }
    }

    return new Response(JSON.stringify({ success: true, scheduledAt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[self-delete-account] error', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
