## Problem

Partner Sebastian (sebastiansnopek.eqology@gmail.com) registered for the Kraków event and received the confirmation email, but does not appear in **Eventy → Formularze → Zgłoszenia → Partnerzy**.

### Root cause

The platform has two parallel registration paths for paid events:

1. **Form path** (`event_form_submissions`) — used by the public `/e/...` form (`submit_event_form` RPC). Always creates a row in `event_form_submissions`.
2. **Ticket order path** (`paid_event_orders`) — used by the "Buy ticket / Transfer" flow (`register-event-transfer-order` edge function). Creates a row in `paid_event_orders` only.

The admin **Zgłoszenia / Partnerzy** tab reads only from `event_form_submissions`, so any registration done through the ticket-order flow is invisible there — even though the partner gets the confirmation email.

Sebastian has 2 records in `paid_event_orders` for the Kraków event (status `awaiting_transfer`) and **0** records in `event_form_submissions`. That's why he is missing from the Partners tab. He DOES appear in the **Zamówienia** tab.

### Fix

Make `register-event-transfer-order` mirror the order into `event_form_submissions` so logged-in partners (and guests) buying a ticket are also visible in the Formularze → Zgłoszenia view, with correct partner attribution.

## Plan

### 1. Edge function `register-event-transfer-order`

After successfully inserting into `paid_event_orders`, additionally insert a row into `event_form_submissions`:

- Look up the active `event_registration_forms` for this `event_id` (use `is_active = true`, take the first one). If none — skip mirroring (nothing to mirror to).
- Resolve `partner_user_id` and `partner_link_id` from `paid_event_partner_links` using:
  - The provided `ref_code` if present, OR
  - For a logged-in user, fall back to a link where `partner_user_id = current user`. (Auto-attribution — the partner registered themselves.)
- Insert into `event_form_submissions` with:
  - `form_id`, `event_id`, `first_name`, `last_name`, `email` (lowercased), `phone`
  - `partner_user_id`, `partner_link_id`
  - `payment_status = 'pending'` (transfer not yet confirmed; admin can mark `paid` later)
  - `email_status = 'sent'` (the function already sent the confirmation email)
  - `submitted_data` = `{ source: 'ticket_order', order_id, ticket_id, quantity, total_amount }`
- Wrap in try/catch — must NEVER fail the order if mirroring fails (log and continue).
- Bump `paid_event_partner_links.submission_count` when partner_link_id resolved (mirror RPC behavior).

### 2. Backfill existing orders

Migration: for every row in `paid_event_orders` where the event has an active `event_registration_forms` AND no matching submission exists in `event_form_submissions` (matched by lowercased email + form_id), insert a mirroring submission row. This covers Sebastian's 2 existing orders and any other historical case.

For partner attribution during backfill, use the same fallback (ref_code on order is not stored, so resolve via `paid_event_partner_links.partner_user_id = paid_event_orders.user_id` for logged-in users).

### 3. No UI changes required

The existing `EventFormSubmissions.tsx` already reads everything from `event_form_submissions`, so once the rows exist, Sebastian will show up under the **Partnerzy** tab automatically (because his submission will have `email` matching a profile and `partner_user_id` set to his own user_id).

## Files

- `supabase/functions/register-event-transfer-order/index.ts` — add mirror insert after order insert.
- New migration `supabase/migrations/<ts>_mirror_paid_orders_to_event_form_submissions.sql` — backfill existing orders.

## Out of scope

- Not changing the order flow itself (PayU / transfer logic stays).
- Not unifying the two tables (would be a larger refactor).
- Not touching `event_registrations` (different feature: webinars / team trainings).
