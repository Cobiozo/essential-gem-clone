

# Plan: Resend invite + Send to alternate email

## Current state
- `InviteToEventDialog` shows green "Zaproszenie wysłane" badge for already-invited events
- `team_contacts` table has single `email` field, no secondary email column
- `TeamContact` type has single `email` field

## Changes

### 1. Database migration — add `secondary_email` to `team_contacts`

```sql
ALTER TABLE public.team_contacts ADD COLUMN secondary_email text;
```

### 2. Update `TeamContact` type

Add `secondary_email: string | null` to the interface in `types.ts`.

### 3. Rewrite the "already invited" section in `InviteToEventDialog.tsx`

Replace the simple green badge with a mini action group:

```
┌─────────────────────────────────────────────────────────────┐
│ Prezentacja możliwości biznesowych                          │
│ Webinar  📅 18 marca 2026 • 19:00                          │
│                                                             │
│  ✅ Zaproszenie wysłane                                     │
│  [↻ Wyślij ponownie]  [📧 Wyślij na inny email]           │
└─────────────────────────────────────────────────────────────┘
```

- **"Wyślij ponownie"** — re-invokes `send-webinar-confirmation` edge function with the same email (no new RPC registration, just resend the email). Logs `event_invite_resend` to `team_contacts_history`.

- **"Wyślij na inny email"** — opens inline input field for alternate email. On submit:
  1. Calls `register_event_guest` RPC with the new email
  2. Sends confirmation email to the new email
  3. Updates `team_contacts.secondary_email` with the new email
  4. Logs `event_invite_alt_email` to `team_contacts_history`

### 4. State additions in component

- `resending: string | null` — tracks which event is being resent
- `altEmailEventId: string | null` — which event's alt-email input is open
- `altEmailValue: string` — the typed alternate email

### Files to change

| File | Change |
|------|--------|
| New SQL migration | Add `secondary_email` column |
| `src/components/team-contacts/types.ts` | Add `secondary_email` field |
| `src/components/team-contacts/InviteToEventDialog.tsx` | Resend button + alt email input + handlers |

