

# Fix: Cancelled registrations showing as active event groups

## Root Cause

Database query confirmed: `byk1023@wp.pl` has 3 records in `guest_event_registrations`:
- **Szansa Biznesowa**: 1 cancelled record (from deleted contact) — `team_contact_id` still points to the reactivated contact
- **Prezentacja możliwości biznesowych**: 1 cancelled + 1 registered (re-registration after delete)

The `fetchEventContactIds` query fetches ALL statuses. After deduplication, the cancelled record for "Szansa Biznesowa" survives (only record for that contact+event pair), creating a phantom event group.

## Fix

### File: `src/hooks/useTeamContacts.ts`

In `fetchEventContactIds` — after deduplication, **skip records where `status = 'cancelled'`** when building the event groups and details map. Only add to `ids` and `detailsMap` if the best (deduplicated) record has `status = 'registered'`.

The attempt counter still counts ALL records (including cancelled) — this is correct for showing "Ponowna próba ×N".

```typescript
// After deduplication loop, when iterating seenContactEvent.values():
for (const r of seenContactEvent.values()) {
  // Skip cancelled-only entries — they shouldn't create event groups
  if (r.status === 'cancelled') continue;
  
  const contactId = r.team_contact_id as string;
  // ... rest of logic
}
```

This single change fixes both issues:
- No phantom event groups for cancelled registrations
- No "Zapisany na 2 wydarzeń" badge (since only 1 active registration exists)
- Attempt count stays correct (counts all records including cancelled)

| File | Change |
|------|--------|
| `src/hooks/useTeamContacts.ts` | Skip `status = 'cancelled'` records when building event groups |

