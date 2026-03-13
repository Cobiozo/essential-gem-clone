

# Fix: Dashboard Flash Before MFA + Double Email Code

## Two Problems

### 1. Dashboard visible for ~1 second before MFA gate
**Root cause**: MFA check runs in a separate `useEffect` that triggers AFTER `rolesReady=true`. Timeline:
- `fetchProfile` completes → `rolesReady=true` → App renders dashboard
- Then MFA `useEffect` fires → RPC call → `mfaPending=true` → MFA screen

**Fix**: Move MFA check INTO `fetchProfile()`, right after role is fetched. Set `mfaPending=true` BEFORE setting `rolesReady=true`. This way the app never renders dashboard — it goes straight from loading spinner to MFA challenge.

### 2. Two email codes sent
**Root cause**: `MFAChallenge` mounts, calls `sendEmailCodeDirect()` in useEffect. Component unmounts (dashboard flash) and remounts (MFA gate activates), triggering the effect twice. React StrictMode in dev also double-fires effects.

**Fix**: Add a `useRef` guard in `MFAChallenge` to ensure `sendEmailCodeDirect` is only called once per mount lifecycle.

## Changes

### `src/contexts/AuthContext.tsx`
- Remove the separate MFA `useEffect` (lines 480-515) and `mfaCheckedRef`
- Move MFA check into `fetchProfile()`: after fetching profile + role, call `supabase.rpc('get_my_mfa_config')`. If `required=true`, set `mfaPending(true)` before returning
- This ensures `mfaPending` is set BEFORE `rolesReady` becomes true, so App never renders dashboard

### `src/components/auth/MFAChallenge.tsx`
- Add a `sendCodeCalledRef = useRef(false)` guard
- In `useEffect` init function, check `sendCodeCalledRef.current` before calling `sendEmailCodeDirect()`. Set it to `true` after calling
- This prevents duplicate emails from StrictMode double-mount or component remounting

