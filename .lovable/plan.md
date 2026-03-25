

# Fix: register_event_guest function ambiguity

## Problem
The migration added a NEW overload of `register_event_guest` with the extra `p_slot_time` parameter but did NOT drop the old version. PostgreSQL now has two candidate functions and cannot choose between them when `p_slot_time` is NULL.

## Solution

**Single migration** that drops the old function signature (without `p_slot_time`) so only the new one remains:

```sql
DROP FUNCTION IF EXISTS public.register_event_guest(uuid, text, text, text, text, uuid, text);
```

This leaves only `register_event_guest(uuid, text, text, text, text, uuid, text, text)` (the one with `p_slot_time DEFAULT NULL`), which handles both auto-webinar and regular event registrations.

**Also update `InviteToEventDialog.tsx`** — two calls to `register_event_guest` that don't pass `p_slot_time`. Add `p_slot_time: null` to both calls for clarity (though after dropping the old overload, the default will work).

## Files
| File | Change |
|---|---|
| Migration SQL | `DROP FUNCTION` old signature |
| `src/components/team-contacts/InviteToEventDialog.tsx` | Add `p_slot_time: null` to both RPC calls |

