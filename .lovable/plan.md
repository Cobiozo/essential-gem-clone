

# Fix: Dodanie subskrypcji real-time na tabelę `events` w useEvents

## Problem
Hook `useEvents` (używany przez Dashboard/CalendarWidget) nie nasłuchuje zmian w tabeli `events` — tylko w `event_registrations`. Nowo utworzone/zmodyfikowane wydarzenia nie pojawiają się do odświeżenia strony.

## Zmiana

### Plik: `src/hooks/useEvents.ts` (linie 709-733)

Dodanie drugiego nasłuchiwania `postgres_changes` na tabeli `events` (tak jak robi to `usePublicEvents`):

```typescript
useEffect(() => {
  fetchEvents();
  if (!user?.id) return;

  const channel = supabase
    .channel(`events-and-registrations-${user.id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'events',             // ← NOWE: nasłuchuj zmiany wydarzeń
    }, () => { fetchEvents(); })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'event_registrations',
      filter: `user_id=eq.${user.id}`
    }, () => { fetchEvents(); })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [fetchEvents, user?.id]);
```

Jedna zmiana w jednym pliku. Zachowanie identyczne jak w `usePublicEvents`.

