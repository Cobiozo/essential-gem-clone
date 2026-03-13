

# Fix: MFA Enforcement + Email Sending

## Root Causes

### 1. MFA gate bypassed on page refresh
`AuthContext` only checks MFA enforcement when `loginComplete === true`, which is only set during fresh `signIn()`. On page refresh/tab reopen, `loginComplete` stays `false` and MFA is never checked. Fix: also check MFA on initial session restore (after `getSession()` + `fetchProfile()`).

### 2. Email functions call `send-single-email` with wrong params
Both `send-mfa-code` and `send-security-report` call `send-single-email` passing `{to, subject, html}`, but that function expects `{template_id, recipient_user_id}` and requires admin role. Both will fail with "Unauthorized" or param errors. Fix: implement direct SMTP sending in both functions (same pattern as working `send-training-notification`).

## Changes

### 1. `src/contexts/AuthContext.tsx`
- Add MFA check after initial session restore (in `getSession().then(...)` after `fetchProfile` completes)
- Remove `loginComplete` dependency from MFA effect — check whenever `user + rolesReady + userRole` are set
- Keep `mfaPending` persistent until `completeMfa()` is called

### 2. `supabase/functions/send-mfa-code/index.ts`
- Remove call to `send-single-email`
- Add direct SMTP sending using `Deno.connectTls` (same pattern as `send-training-notification`)
- Use `smtp_settings` table with correct column names (`smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, `sender_email`, `sender_name`, `smtp_encryption`)

### 3. `supabase/functions/send-security-report/index.ts`
- Same fix: replace `send-single-email` call with direct SMTP
- Use correct `smtp_settings` column names

### 4. `supabase/functions/verify-mfa-code/index.ts`
- Quick review to ensure it works correctly (no email sending, just DB check)

## Files modified: 4
- `src/contexts/AuthContext.tsx` — MFA check on every session, not just fresh login
- `supabase/functions/send-mfa-code/index.ts` — direct SMTP
- `supabase/functions/send-security-report/index.ts` — direct SMTP  
- `supabase/functions/verify-mfa-code/index.ts` — verify correctness

