

# Plan: Skrócenie linków zaproszeń na wydarzenia

## Problem
Obecny format linku:
`https://purelife.lovable.app/events/register/550e8400-e29b-41d4-a716-446655440000?invited_by=6ba7b810-9dad-11d1-80b4-00c04fd430c8`

Dwa pełne UUID-y = bardzo długi URL.

## Rozwiązanie
Użyć istniejących pól `slug` (wydarzenia) i `eq_id` (profil zapraszającego):

`https://purelife.info.pl/e/{event-slug}?ref={EQID}`

Np.: `https://purelife.info.pl/e/webinar-zdrowie-2025?ref=PL1234`

## Zmiany

### 1. Nowa krótka trasa `/e/:slug`
Dodać route w `App.tsx` → nowa strona `EventRegistrationBySlug.tsx`:
- Pobiera event po `slug` zamiast UUID
- Rozwiązuje `ref` param → lookup `eq_id` w `profiles` → pobiera `user_id`
- Przekazuje dane do istniejącego formularza rejestracji

### 2. Zmiana generowania linków (3 pliki)
W `EventCard.tsx`, `EventCardCompact.tsx`, `CalendarWidget.tsx`:
- Zamiast `window.location.origin` użyć domeny produkcyjnej z `page_settings.app_base_url`
- Zamiast UUID wydarzenia użyć `event.slug`
- Zamiast `?invited_by={user.id}` użyć `?ref={profile.eq_id}`

### 3. Zachowanie kompatybilności wstecznej
Stara trasa `/events/register/:eventId?invited_by=UUID` nadal działa bez zmian.

### Pliki do edycji:
1. `src/App.tsx` — dodać route `/e/:slug`
2. `src/pages/EventRegistrationBySlug.tsx` — nowa strona (resolver slug→event, eq_id→user_id, render formularza)
3. `src/components/events/EventCard.tsx` — skrócić generowany link
4. `src/components/events/EventCardCompact.tsx` — skrócić generowany link
5. `src/components/dashboard/widgets/CalendarWidget.tsx` — skrócić generowany link

