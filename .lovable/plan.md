

# Fix: RLS policy blocks auto-webinar registration for anonymous users

## Problem

The RLS policy `events_public_registration_access` on the `events` table requires **all three conditions** for anonymous (anon) users:
- `is_active = true`
- `is_published = true` 
- `requires_registration = true`

The auto-webinar event has `is_published = false` (hidden from calendar), so the anon SELECT query returns 0 rows → PGRST116 error.

The previous fix removed `is_published` from the **application query**, but the **database RLS policy** still enforces it at the Postgres level.

## Solution

Update the RLS policy to allow anon users to SELECT active events regardless of `is_published`. The `is_published` flag should only control calendar/dashboard visibility in the app, not database-level access for registration.

**SQL migration:**
```sql
DROP POLICY IF EXISTS "events_public_registration_access" ON public.events;

CREATE POLICY "events_public_registration_access"
ON public.events
FOR SELECT
TO anon
USING (is_active = true);
```

This allows the registration page to load any active event for anonymous guests, whether it's published in the calendar or not. Security is maintained because `is_active` still controls overall availability, and the anon role can only SELECT — no writes.

| File | Change |
|------|--------|
| SQL migration | Update `events_public_registration_access` policy — remove `is_published` and `requires_registration` checks |

One SQL change, no code file changes needed.

