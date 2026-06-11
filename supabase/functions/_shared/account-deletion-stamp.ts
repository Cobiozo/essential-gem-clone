// Shared helper: stamp all event-ticket / registration rows belonging to a
// user that is being anonymized or permanently deleted, so the admin panel
// and ticket verification still see what the ticket was issued for, while
// making it clear the underlying account no longer exists.

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

  // paid_event_orders: by user_id, and (best-effort) by email for legacy rows
  try {
    await supabaseAdmin.from('paid_event_orders').update(patch).eq('user_id', userId);
    if (emailLc) {
      await supabaseAdmin.from('paid_event_orders').update(patch)
        .eq('email', emailLc).is('account_deleted_at', null);
    }
  } catch (e) { console.warn('[stamp] paid_event_orders failed', e); }

  // paid_event_order_attendees: by email (attendee row stores e-mail of the
  // person who actually holds the QR ticket).
  if (emailLc) {
    try {
      await supabaseAdmin.from('paid_event_order_attendees').update(patch)
        .eq('email', emailLc).is('account_deleted_at', null);
    } catch (e) { console.warn('[stamp] paid_event_order_attendees failed', e); }
  }

  // event_form_submissions: by user_id and email
  try {
    await supabaseAdmin.from('event_form_submissions').update(patch).eq('user_id', userId);
    if (emailLc) {
      await supabaseAdmin.from('event_form_submissions').update(patch)
        .eq('email', emailLc).is('account_deleted_at', null);
    }
  } catch (e) { console.warn('[stamp] event_form_submissions failed', e); }

  // guest_event_registrations: by email
  if (emailLc) {
    try {
      await supabaseAdmin.from('guest_event_registrations').update(patch)
        .eq('email', emailLc).is('account_deleted_at', null);
    } catch (e) { console.warn('[stamp] guest_event_registrations failed', e); }
  }
}
