

# Late Join Policy for Auto-Webinar (Guest Perspective)

## Goal
When a guest arrives at the public watch page, enforce a **5-minute late join window**. If they're more than 5 minutes into the current slot, block entry with a "meeting in progress" message. Never reveal that sessions repeat automatically.

## Current Behavior
- `useAutoWebinarSync` calculates `secondsIntoSlot` — how far into the current time slot we are
- If video is still playing (`secondsIntoSlot < video.duration_seconds`), it sets `startOffset = secondsIntoSlot` and the player joins mid-stream
- If video has ended, it shows a countdown to the next slot
- Guests and logged-in users see exactly the same thing — including countdowns

## Changes

### 1. Add `late_join_max_seconds` to config (DB + types)
**Migration SQL**: Add column `late_join_max_seconds INTEGER DEFAULT 300` to `auto_webinar_config`.
**`src/types/autoWebinar.ts`**: Add `late_join_max_seconds: number | null` to `AutoWebinarConfig`.

### 2. Update `useAutoWebinarSync` to expose `isTooLate`
**`src/hooks/useAutoWebinar.ts`**:
- Add new state `isTooLate: boolean` (default false)
- When `isInActiveHours && secondsIntoSlot > lateJoinMaxSeconds` (default 300 = 5 min): set `isTooLate = true`, `startOffset = -1`, `secondsToNext = 0`
- This only applies when `isGuest` context is active — add `isGuest` parameter to the hook
- For non-guest (logged-in) users, behavior stays unchanged (they see normal playback/countdown)
- When `isTooLate = true`, do NOT set `secondsToNext` to anything revealing — keep it at 0

### 3. Update `AutoWebinarEmbed` to show "too late" message for guests
**`src/components/auto-webinar/AutoWebinarEmbed.tsx`**:
- Pass `isGuest` to `useAutoWebinarSync`
- When `isTooLate === true`, render a dedicated blocking screen:
  - Dark background, professional tone
  - Text: "Spotkanie jest w trakcie" / "Cenimy sobie punktualność..."
  - "W celu ustalenia nowego terminu skontaktuj się z osobą, która zaprosiła Cię na to spotkanie."
  - No countdown, no "next session" info, no links to reschedule
  - Optional: small logo at top

### 4. Admin config field (optional, Phase 2)
**`src/components/admin/AutoWebinarManagement.tsx`**: Add a numeric input "Maks. spóźnienie (sekundy)" to let admin configure the late join window (default 300s = 5 min). For now, hardcode 300s in the hook.

## Implementation Approach

### `useAutoWebinarSync` signature change:
```typescript
useAutoWebinarSync(videos, config, isGuest)
```
New return value: `{ currentVideo, startOffset, isInActiveHours, secondsToNext, isTooLate }`

### Key logic in `calculate()`:
```text
if (isGuest && secondsIntoSlot > lateJoinMaxSeconds) {
  isTooLate = true
  startOffset = -1
  secondsToNext = 0  // hide next slot info
  return
}
```

### "Too late" UI (guest only):
```text
┌──────────────────────────────────────┐
│          [Pure Life Logo]            │
│                                      │
│    ⚠  Spotkanie jest w trakcie       │
│                                      │
│  Cenimy sobie punktualność w celu    │
│  pełnego zrozumienia przekazywanej   │
│  wiedzy. Dołączenie w tym momencie   │
│  nie jest możliwe.                   │
│                                      │
│  W celu ustalenia nowego terminu     │
│  skontaktuj się z osobą, która       │
│  zaprosiła Cię na to spotkanie.      │
│                                      │
└──────────────────────────────────────┘
```

## Files to change

| File | Change |
|---|---|
| Migration SQL | Add `late_join_max_seconds` column |
| `src/types/autoWebinar.ts` | Add field to interface |
| `src/hooks/useAutoWebinar.ts` | Add `isGuest` param, `isTooLate` logic |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Pass `isGuest`, render "too late" screen, hide countdown for guests |

