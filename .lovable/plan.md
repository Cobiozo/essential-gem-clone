## Diagnoza

### Problem 1 — Przycisk "Dowiedz się więcej…" przekierowuje na /auth

W `src/components/profile/ProfileCompletionGuard.tsx` lista `PUBLIC_PATHS` (linie 18-31) zawiera m.in. `/event-form/`, `/e/`, `/events/register/`, ale **nie zawiera `/events/{slug}`** (publiczna strona płatnego wydarzenia). Trafia więc do `ProtectedRouteGuard`, który dla niezalogowanego użytkownika wykonuje `<Navigate to="/auth" />`.

Ścieżki `/events/webinars`, `/events/team-meetings`, `/events/individual-meetings`, `/events/register/...` muszą **pozostać chronione** (tylko zalogowani). Nowa ścieżka `/events/{slug}` (PaidEventPage) ma być publiczna.

### Problem 2 — Sekcja prelegentów zajmuje za dużo miejsca

`src/components/paid-events/public/PaidEventSpeakers.tsx`:
- siatka 1/2 kolumny, padding `p-6`, zdjęcie 96×96 px, tekst wyśrodkowany na całej karcie
- każda karta zajmuje ~270 px wysokości — przy 5 prelegentach ramka mocno rozciąga stronę

## Plan naprawczy

### A. Naprawa routingu publicznej strony wydarzenia

W `src/components/profile/ProfileCompletionGuard.tsx`:

1. Dodać `/events/` do `PUBLIC_PATHS`. Wszystkie kolizje (`/events/webinars`, `/events/team-meetings`, `/events/individual-meetings`, `/events/register/`) — to są **chronione** ścieżki i tak nie powinny być dostępne dla niezalogowanych. Po analizie kodu: te trasy nie są w PUBLIC_PATHS, więc obecnie też wymagają logowania, ALE teraz dodanie `/events/` zrobi je publicznymi → trzeba to obejść.

2. **Lepsze rozwiązanie:** dodać dokładny prefiks tylko dla pojedynczego segmentu po `/events/`. Wykorzystać już istniejący wzorzec: dodać do bloku publicznego sprawdzenie regex `^/events/[^/]+/?$` z wykluczeniem znanych chronionych podścieżek:

```ts
// Public paid event page: /events/{slug} (single segment)
const EXCLUDED_EVENTS_SUBPATHS = ['/events/webinars', '/events/team-meetings', '/events/individual-meetings', '/events/register'];
const isPublicPaidEventPage = /^\/events\/[^/]+\/?$/.test(location.pathname)
  && !EXCLUDED_EVENTS_SUBPATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
```

Następnie:
```ts
if (isPublicPath || isPartnerPage || isPublicPaidEventPage) {
  return <>{children}</>;
}
```

Również dodać `/paid-events` (lista publicznych wydarzeń) jako dokładny match — patrząc na route `/paid-events` w App.tsx (linia 414), powinien być publiczny.

### B. Kompaktowa sekcja prelegentów

W `src/components/paid-events/public/PaidEventSpeakers.tsx`:

1. Zmienić układ na **horyzontalny** (zdjęcie po lewej, treść po prawej) — oszczędza ~50% wysokości.
2. Zmniejszyć padding karty z `p-6` na `p-4`.
3. Zmniejszyć zdjęcie z `w-24 h-24` (96 px) na `w-16 h-16` (64 px), `shrink-0`.
4. Zmienić siatkę: na desktop **3 kolumny** (`md:grid-cols-2 lg:grid-cols-3`), gap `gap-4`.
5. Tekst wyrównać do lewej (nie wyśrodkowany), `text-base` zamiast `text-lg` dla nazwy.
6. Bio: `line-clamp-2` zamiast `line-clamp-3`. Przycisk "Czytaj więcej" mniejszy (`h-7 text-xs`, `px-2`).
7. Zmniejszyć padding sekcji z `py-8 md:py-12` na `py-6 md:py-8`.

## Pliki do edycji

1. `src/components/profile/ProfileCompletionGuard.tsx` — dodać regex match dla publicznej `/events/{slug}` z wykluczeniem chronionych podścieżek + dokładny match dla `/paid-events`.
2. `src/components/paid-events/public/PaidEventSpeakers.tsx` — zmiana układu kart na horyzontalny i 3 kolumny, mniejsze rozmiary.

## Efekt końcowy

- Przycisk "Dowiedz się więcej na temat wydarzenia" otwiera publiczną stronę wydarzenia bez wymuszania logowania.
- Sekcja Prelegenci zajmuje ~50% mniej wysokości — 5 prelegentów mieści się w 2 rzędach po 3 zamiast 3 rzędach po 2.