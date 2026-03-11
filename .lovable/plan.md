

# Fix: Deduplikacja gości w widoku wydarzeń

## Problem
Gdy gość ma wiele rejestracji na to samo wydarzenie (np. anulowana + nowa), system dodaje go wielokrotnie do listy kontaktów w grupie wydarzenia. Wystarczy jeden wpis z informacją o liczbie prób.

## Zmiana

### Plik: `src/hooks/useTeamContacts.ts`

W `fetchEventContactIds` (linie 308-328): Zamiast iterować po wszystkich wierszach rejestracji i dodawać każdy jako osobny wpis, najpierw deduplikować po kluczu `contactId::eventId` — zachować tylko najnowszą aktywną rejestrację, ale policzyć wszystkie próby (attemptCounter już to robi poprawnie).

```typescript
// Zamiast:
for (const r of (data || [])) {
  // ... dodaje KAŻDY wiersz jako osobny wpis

// Nowe podejście:
const seenContactEvent = new Map<string, row>();
for (const r of (data || [])) {
  const dedupeKey = `${r.team_contact_id}::${r.event_id}`;
  const existing = seenContactEvent.get(dedupeKey);
  // Preferuj 'registered' nad 'cancelled', potem najnowszy registered_at
  if (!existing || 
      (r.status === 'registered' && existing.status !== 'registered') ||
      (r.status === existing.status && (r.registered_at || '') > (existing.registered_at || ''))) {
    seenContactEvent.set(dedupeKey, r);
  }
}
// Iteruj po deduplikowanych wierszach
for (const r of seenContactEvent.values()) { ... }
```

Efekt: Jeden kontakt = jeden wpis w grupie wydarzenia, z badge "Ponowna próba ×N" jeśli było wiele prób.

| Plik | Zmiana |
|------|--------|
| `src/hooks/useTeamContacts.ts` | Deduplikacja rejestracji per contact+event w `fetchEventContactIds` |

