

# Fix: slot_time is a bare time string, not a datetime

## Root cause

The `slot_time` column in `guest_event_registrations` stores just a time like `"13:30"`, not a full ISO datetime. The previous fix blindly used `slot_time` as the first element in `slot_time || registered_at || events.start_time`, causing:

1. **"Invalid Date"** — `new Date("13:30")` returns Invalid Date
2. **Wrong "Dołączył 22:00"** — In `ContactEventInfoButton`, the fallback view matching uses `new Date(regSlotTime).getTime()` which returns `NaN`. The time-window check `viewMs < NaN` is always `false`, so ALL views pass the filter regardless of time, matching a view from the 22:00 slot to a 13:30 registration.

## Solution

Create a helper that combines `registered_at` date part + `slot_time` to produce a proper datetime string. Apply it in all 3 files.

### Helper function

```ts
// Combine registration date + slot_time ("HH:MM") into a full datetime
function buildSlotDatetime(registeredAt: string, slotTime: string): string {
  const datePart = registeredAt.substring(0, 10); // "2026-03-31"
  return `${datePart}T${slotTime}:00`;
}
```

### File 1: `src/components/team-contacts/ContactEventInfoButton.tsx`

**Line 164** — event_date mapping:
```ts
// Before (broken):
event_date: r.slot_time || r.registered_at || r.events?.start_time || '',

// After:
event_date: (r.slot_time && r.registered_at) 
  ? `${r.registered_at.substring(0, 10)}T${r.slot_time}:00`
  : r.registered_at || r.events?.start_time || '',
```

**Lines 127-143** — fallback view matching slot window:
```ts
// Before (broken — new Date("13:30") = NaN):
const regSlotTime = (reg as any).slot_time;
// ...
if (regSlotTime && v.created_at) {
  const slotMs = new Date(regSlotTime).getTime();

// After — build proper datetime from registered_at date + slot_time:
const regSlotTime = (reg as any).slot_time;
const regRegisteredAt = (reg as any).registered_at;
// ...
if (regSlotTime && regRegisteredAt && v.created_at) {
  const slotDatetime = `${regRegisteredAt.substring(0, 10)}T${regSlotTime}:00`;
  const slotMs = new Date(slotDatetime).getTime();
```

### File 2: `src/hooks/useTeamContacts.ts`

**Line 483** — event_start_time in EventRegistrationInfo:
```ts
// Before:
event_start_time: (r as any).slot_time || r.registered_at || event.start_time || '',

// After:
event_start_time: ((r as any).slot_time && r.registered_at) 
  ? `${r.registered_at.substring(0, 10)}T${(r as any).slot_time}:00`
  : r.registered_at || event.start_time || '',
```

### File 3: `src/components/team-contacts/TeamContactHistoryDialog.tsx`

Same pattern — combine `slot_time` + `registered_at` date part instead of using bare `slot_time`.

## Files to edit

1. `src/components/team-contacts/ContactEventInfoButton.tsx` — fix event_date mapping + fix view matching window
2. `src/hooks/useTeamContacts.ts` — fix event_start_time construction
3. `src/components/team-contacts/TeamContactHistoryDialog.tsx` — fix event_date construction

## Effect

- Event dates display correctly (e.g., "31 marca 2026 13:30" instead of "Invalid Date")
- View matching correctly filters by time window, preventing cross-slot matches
- "Dołączył" shows the actual join time for the correct slot

