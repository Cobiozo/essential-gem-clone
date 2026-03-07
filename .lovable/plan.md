

## Problem: Password Reset Flow — 3 Critical Issues

### Issue 1: Wrong domain in recovery link
**File:** `supabase/functions/send-password-reset/index.ts` (line 222)  
`redirectTo: 'https://purelife.lovable.app/reset-password'` — production is at `https://purelife.info.pl`.  
When user clicks the email button, they're sent to the wrong domain.

**Same issue in:** `supabase/functions/admin-reset-password/index.ts` (line 288)  
`loginUrl: 'https://purelife.lovable.app/change-password'` — also wrong domain.

### Issue 2: Race condition in ResetPassword.tsx
The `checkSession()` call on line 32-38 runs immediately and may resolve BEFORE Supabase processes the URL hash tokens (which triggers `PASSWORD_RECOVERY`). Result: `sessionChecked = true` + `isRecoverySession = false` → user sees "Nieprawidłowy link" even though the link is valid.

### Issue 3: `checkSession` treats ANY session as recovery
Line 34: `if (session) { setIsRecoverySession(true); }` — a logged-in user navigating to `/reset-password` would see the password form instead of the error. Should only respond to actual `PASSWORD_RECOVERY` events.

---

## Fix Plan

### 1. Fix domain in `send-password-reset/index.ts`
Change line 222:
```
redirectTo: 'https://purelife.info.pl/reset-password'
```

### 2. Fix domain in `admin-reset-password/index.ts`
Change line 288:
```
loginUrl: 'https://purelife.info.pl/change-password'
```

### 3. Fix race condition in `ResetPassword.tsx`
Replace the `useEffect` logic:
- Remove the `checkSession()` fallback that blindly trusts any session
- Add a delay/timeout before declaring "no recovery session" to give Supabase time to process the URL hash
- Check URL hash for `type=recovery` as an additional signal
- Only set `sessionChecked = true` (with `isRecoverySession = false`) after a reasonable timeout (e.g., 3 seconds)

```typescript
useEffect(() => {
  let timeoutId: NodeJS.Timeout;
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setIsRecoverySession(true);
      setSessionChecked(true);
      clearTimeout(timeoutId);
    }
  });

  // Check URL hash for recovery indicators
  const hash = window.location.hash;
  const hasRecoveryParams = hash.includes('type=recovery') || 
    hash.includes('type=magiclink');
  
  if (hasRecoveryParams) {
    // Give Supabase time to process the hash tokens
    timeoutId = setTimeout(() => {
      if (!sessionChecked) setSessionChecked(true);
    }, 5000);
  } else {
    // No recovery params in URL — not a valid recovery link
    setSessionChecked(true);
  }

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeoutId);
  };
}, []);
```

### Files changed: 3
- `supabase/functions/send-password-reset/index.ts` — 1 line
- `supabase/functions/admin-reset-password/index.ts` — 1 line  
- `src/pages/ResetPassword.tsx` — useEffect rewrite (~20 lines)

