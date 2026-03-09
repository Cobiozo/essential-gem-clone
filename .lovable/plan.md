

# Naprawa: auto-webinar nie powinien się pokazywać w kalendarzu

## Problem

Hook `useEvents.ts` (używany przez Dashboard → CalendarWidget i MyMeetingsWidget) pobiera wszystkie wydarzenia z `is_active = true`, ale **nie filtruje po `is_published`**. Auto-webinar jest tworzony z `is_published: false`, ale `is_active: true`, więc pojawia się w kalendarzu mimo wyłączonej opcji "Widoczne w kalendarzu".

## Rozwiązanie

W `src/hooks/useEvents.ts` (linia ~40) dodać filtr `.eq('is_published', true)` do zapytania Supabase, analogicznie jak w `usePublicEvents.ts` (linia 26).

```
.eq('is_active', true)
.eq('is_published', true)   // ← dodać
```

Dzięki temu wydarzenia z `is_published: false` (w tym auto-webinary bez włączonej widoczności w kalendarzu) nie pojawią się w widżecie kalendarza ani w "Moje spotkania" na Dashboardzie.

## Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useEvents.ts` | Dodać `.eq('is_published', true)` do query |

