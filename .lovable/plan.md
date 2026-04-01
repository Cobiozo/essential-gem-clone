

# Fix: Wyświetlanie daty rejestracji zamiast daty terminu wydarzenia

## Problem

W widoku CRM przy nazwie webinaru wyświetla się data rejestracji gościa (23:22) zamiast data terminu slotu (23:30).

W `useTeamContacts.ts` linia 530, dla auto-webinarów `groupDate` jest ustawiane na `reg.registered_at`, ale powinno używać `reg.event_start_time` — które już jest poprawnie obliczone jako `registered_at_date + slot_time` (linia 483-484).

## Rozwiązanie

Jedna zmiana w `src/hooks/useTeamContacts.ts` — w `buildEventGroups`, linia 530:

**Zmiana z:**
```typescript
groupDate = reg.registered_at;
```

**Na:**
```typescript
groupDate = reg.event_start_time;
```

To sprawi, że data wyświetlana pod nazwą wydarzenia będzie datą terminu slotu (np. "01 kwietnia 2026 23:30") zamiast momentu rejestracji.

