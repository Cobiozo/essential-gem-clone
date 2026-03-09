

# Fix: Zawyżone liczby rejestracji przez wielokrotne wpisy cyklicznych terminów

## Problem

Dla wydarzeń cyklicznych (z `occurrences`) każdy termin tworzy **osobny wiersz** w `event_registrations` (różne `occurrence_index`). Aleksandra Suchinski zapisana na 5 terminów = 5 wierszy. Statystyki liczą `registrations.length` zamiast unikalnych użytkowników, co zawyża "Wszystkich: 68" i "Aktywnych: 68".

**Dotyczy 2 miejsc:**

## Zmiany

### 1. `EventRegistrationsManagement.tsx` — statystyki unikalne per użytkownik

Zmienić `userStats` aby liczył unikalne `user_id`:

```typescript
const userStats = useMemo(() => {
  const uniqueUsers = new Set(registrations.map(r => r.user_id));
  const activeUsers = new Set(registrations.filter(r => r.status === 'registered').map(r => r.user_id));
  const cancelledUsers = new Set(registrations.filter(r => r.status === 'cancelled').map(r => r.user_id));
  return { total: uniqueUsers.size, active: activeUsers.size, cancelled: cancelledUsers.size };
}, [registrations]);
```

Tabela nadal wyświetla wszystkie wiersze (każdy termin osobno) — bo to dane operacyjne. Natomiast **liczniki w nagłówku** pokażą unikalne osoby.

### 2. `usePublicEvents.ts` — `registration_count` unikalny per użytkownik

Zmienić zapytanie o liczbę rejestracji, żeby liczyło unikalne `user_id`:

```typescript
const { data: counts } = await supabase
  .from('event_registrations')
  .select('event_id, user_id')
  .eq('status', 'registered')
  .in('event_id', eventIds);

const countMap = new Map<string, number>();
// Count unique users per event
const seenPerEvent = new Map<string, Set<string>>();
counts?.forEach(c => {
  if (!seenPerEvent.has(c.event_id)) seenPerEvent.set(c.event_id, new Set());
  seenPerEvent.get(c.event_id)!.add(c.user_id);
});
seenPerEvent.forEach((users, eventId) => countMap.set(eventId, users.size));
```

Dzięki temu na kartach wydarzeń "X / Y uczestników" pokaże prawdziwą liczbę osób, nie wierszy.

