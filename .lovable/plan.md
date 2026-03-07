

## Problem

Edge function `admin-reset-password` calls `supabase.auth.admin.listUsers()` without pagination — this returns only the **first 50 users**. With 159 users in the system, users beyond page 1 are never found, causing "Nie znaleziono użytkownika" error.

## Fix

**File: `supabase/functions/admin-reset-password/index.ts`**

Replace the `listUsers()` + `.find()` approach with a direct lookup:

1. Query `profiles` table by email to get `user_id`
2. Use `supabase.auth.admin.updateUserById(user_id, { password })` directly

This eliminates pagination entirely and works for any number of users.

```typescript
// BEFORE (broken for 50+ users):
const { data: users } = await supabase.auth.admin.listUsers();
const user = users.users.find(u => u.email === user_email);

// AFTER:
const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('email', user_email)
  .single();

if (profileError || !profileData) {
  throw new Error(`Nie znaleziono użytkownika: ${user_email}`);
}

const userId = profileData.user_id;
// Then use userId for updateUserById and email_logs insert
```

Also update CORS headers to match the standard pattern (add missing client headers).

### Scope: 1 file, ~10 lines changed

