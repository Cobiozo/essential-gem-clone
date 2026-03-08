

# Plan: Licznik osób zapisanych z mojego zaproszenia

## Cel
Wyświetlić na karcie wydarzenia badge z liczbą gości, którzy zarejestrowali się przez link zaproszeniowy zalogowanego użytkownika.

## Zmiany

### 1. `src/components/events/EventCard.tsx`
- Dodać `useEffect` lub `useState` do pobrania liczby gości z `guest_event_registrations` gdzie `invited_by_user_id = user.id` i `event_id = event.id` (status = 'registered')
- Wyświetlić badge w sekcji `CardContent` obok uczestników, np.:
  ```
  👥 Twoje zaproszenia: 3
  ```
- Badge widoczny tylko gdy count > 0 i user jest zalogowany

### 2. Zapytanie
```typescript
const { count } = await supabase
  .from('guest_event_registrations')
  .select('*', { count: 'exact', head: true })
  .eq('event_id', event.id)
  .eq('invited_by_user_id', user.id)
  .eq('status', 'registered');
```

### Pliki do edycji:
1. `src/components/events/EventCard.tsx` — dodać fetch count + wyświetlenie badge

