## Problem

Edge function `guest-redeem-invite` returns 500 with:
```
duplicate key value violates unique constraint "profiles_user_id_key"
Key (user_id)=(...) already exists.
```

After `admin.auth.admin.createUser`, a database trigger (`handle_new_user`) auto-creates a row in `profiles` with that `user_id`. The edge function then calls `.upsert({...}, { onConflict: 'id' })`, but the existing trigger-created row has a different `id` (auto-generated) while sharing the same `user_id`. The unique constraint on `user_id` is violated, the insert fails, the user gets deleted, registration aborts.

## Fix

In `supabase/functions/guest-redeem-invite/index.ts`, replace the `profiles.upsert(..., { onConflict: 'id' })` with `{ onConflict: 'user_id' }` so it updates the row the trigger already created instead of trying to insert a new one.

That's the minimal, targeted fix — no schema changes, no other behavior altered.

## Technical detail

```ts
.upsert({ /* same payload */ }, { onConflict: 'user_id' })
```

This is consistent with how the `profiles` table is keyed by `user_id` (unique) and matches the trigger's insert pattern.
