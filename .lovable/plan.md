

# Plan: Remove "Komunikacja" tab from My Account + Verify registration flow

## 1. Remove "Komunikacja" tab from MyAccount

### File: `src/pages/MyAccount.tsx`

- Line 237: Change `communication: true` → `communication: false`
- This hides the tab and its TabsContent. No other changes needed — the sidebar chat remains the single communication hub.

## 2. Registration flow verification

After reviewing the code:

- **First registration**: RPC inserts new row, returns `{status: 'registered'}` → shows "Rejestracja zakończona!" with green check and confirmation email details. This is correct.
- **Subsequent attempts**: RPC catches `unique_violation`, increments `registration_attempts`, returns `{status: 'already_registered'}` → shows "Jesteś już zarejestrowany/a!" with message about checking email/spam and contacting the inviter. This is correct.
- **RPC function**: Properly uses `SECURITY DEFINER`, matches on `lower(trim(email))`, only updates non-cancelled records.

One visual issue: the "already registered" state shows a **green CheckCircle** icon (line 299), which could be confusing — it looks like success rather than a warning. I'll change it to an **info/warning icon** (e.g., `AlertCircle` in amber) to better communicate "you're already on the list."

## Changes summary

| File | Change |
|------|--------|
| `src/pages/MyAccount.tsx` | Set `communication: false` in `visibleTabs` |
| `src/pages/EventGuestRegistration.tsx` | Change icon from green CheckCircle to amber AlertCircle for `alreadyRegistered` state |

