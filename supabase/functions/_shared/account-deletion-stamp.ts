// Shared helpers used during account deletion / anonymization.
//
// 1) stampAccountDeletionOnTickets — stamps registration/ticket rows that
//    BELONG TO the deleted user (their email/user_id) so the ticket history
//    remains traceable for admins.
//
// 2) stampInviterAccountDeletion — preserves "who invited / created / owns
//    this row" information when the inviter/owner account is removed. We
//    write a snapshot (name, email, roles) onto every dependent row so the
//    admin panel can still display "Konto usunięte (Janek Kowalski)" even
//    after the FK is nulled by ON DELETE SET NULL.

export interface AccountDeletionStamp {
  action: 'anonymized' | 'deleted' | 'auto_deleted';
  snapshot: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    roles?: string[];
  };
}

export async function stampAccountDeletionOnTickets(
  supabaseAdmin: any,
  userId: string,
  email: string | null | undefined,
  stamp: AccountDeletionStamp,
) {
  const actedAt = new Date().toISOString();
  const patch = {
    account_deleted_at: actedAt,
    account_deleted_action: stamp.action,
    account_deleted_snapshot: stamp.snapshot,
  };
  const emailLc = (email || '').trim().toLowerCase();

  try {
    await supabaseAdmin.from('paid_event_orders').update(patch).eq('user_id', userId);
    if (emailLc) {
      await supabaseAdmin.from('paid_event_orders').update(patch)
        .eq('email', emailLc).is('account_deleted_at', null);
    }
  } catch (e) { console.warn('[stamp] paid_event_orders failed', e); }

  if (emailLc) {
    try {
      await supabaseAdmin.from('paid_event_order_attendees').update(patch)
        .eq('email', emailLc).is('account_deleted_at', null);
    } catch (e) { console.warn('[stamp] paid_event_order_attendees failed', e); }
  }

  try {
    await supabaseAdmin.from('event_form_submissions').update(patch).eq('user_id', userId);
    if (emailLc) {
      await supabaseAdmin.from('event_form_submissions').update(patch)
        .eq('email', emailLc).is('account_deleted_at', null);
    }
  } catch (e) { console.warn('[stamp] event_form_submissions failed', e); }

  if (emailLc) {
    try {
      await supabaseAdmin.from('guest_event_registrations').update(patch)
        .eq('email', emailLc).is('account_deleted_at', null);
    } catch (e) { console.warn('[stamp] guest_event_registrations failed', e); }
  }
}

/**
 * Preserve "this row was invited / owned / created by user X" after X is
 * removed. We never overwrite an existing snapshot (so the first deletion
 * action wins). We do NOT null the FK ourselves — for hard deletes the
 * ON DELETE SET NULL on profiles will null it automatically, but the
 * snapshot remains so the UI can still render the inviter as
 * "Konto usunięte (X)".
 */
export async function stampInviterAccountDeletion(
  supabaseAdmin: any,
  userId: string,
  stamp: AccountDeletionStamp,
) {
  const actedAt = new Date().toISOString();
  const snapshot = { ...stamp.snapshot, action: stamp.action };

  // guest_event_registrations.invited_by_user_id
  try {
    await supabaseAdmin.from('guest_event_registrations')
      .update({ inviter_deleted_at: actedAt, inviter_snapshot: snapshot })
      .eq('invited_by_user_id', userId)
      .is('inviter_deleted_at', null);
  } catch (e) { console.warn('[inviter-stamp] guest_event_registrations failed', e); }

  // event_form_submissions.partner_user_id
  try {
    await supabaseAdmin.from('event_form_submissions')
      .update({ partner_deleted_at: actedAt, partner_snapshot: snapshot })
      .eq('partner_user_id', userId)
      .is('partner_deleted_at', null);
  } catch (e) { console.warn('[inviter-stamp] event_form_submissions failed', e); }

  // paid_event_partner_links.partner_user_id
  try {
    await supabaseAdmin.from('paid_event_partner_links')
      .update({ partner_deleted_at: actedAt, partner_snapshot: snapshot })
      .eq('partner_user_id', userId)
      .is('partner_deleted_at', null);
  } catch (e) { console.warn('[inviter-stamp] paid_event_partner_links failed', e); }

  // events.created_by (e.g. tripartite_meeting, partner_consultation)
  try {
    await supabaseAdmin.from('events')
      .update({ creator_deleted_at: actedAt, creator_snapshot: snapshot })
      .eq('created_by', userId)
      .is('creator_deleted_at', null);
  } catch (e) { console.warn('[inviter-stamp] events failed', e); }
}
