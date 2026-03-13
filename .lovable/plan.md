

# Fix: MFA Enforcement Gate in Auth Flow

## Root Cause
`MFAChallenge` component exists but is **never imported or rendered** anywhere. After login, users go straight to dashboard — no MFA check happens.

## Solution
Add an MFA gate in `AuthContext` that:
1. After successful login, checks `security_settings` for `mfa_enforcement` + `mfa_required_roles`
2. If user's role is in required roles → sets `mfaPending = true` state
3. In `App.tsx`, wrap authenticated routes: if `mfaPending` → render `MFAChallenge` instead of the app
4. On `MFAChallenge.onVerified` → set `mfaPending = false`, allow access

## Changes

### 1. `src/contexts/AuthContext.tsx`
- Add `mfaPending` and `setMfaPending` to context
- After profile+role fetch completes, check security_settings
- If `mfa_enforcement === true` AND user role is in `mfa_required_roles` → set `mfaPending = true`
- Expose `mfaPending` and a `completeMfa()` function in context

### 2. `src/App.tsx`
- Import `MFAChallenge`
- In `AppContent`, before rendering routes: if `user && mfaPending` → render `<MFAChallenge onVerified={completeMfa} />` instead of all routes
- This blocks all app access until MFA is verified

### 3. `src/components/auth/MFAChallenge.tsx`
- Minor fix: when `mfa_method` is `email` and no TOTP factor exists, auto-trigger `sendEmailCode` on mount
- Fix the `setting_value` parsing (it's stored as jsonb, might be string `"email"` or raw value)

## Files
- **Modified (3)**: `AuthContext.tsx`, `App.tsx`, `MFAChallenge.tsx`

