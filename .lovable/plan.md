

# Fix: Treść chowa się za sidebar + audyt kompatybilności Apple (iPad/iPhone)

## Zidentyfikowane problemy

### 1. Topbar przewija się z treścią (zamiast być przyklejony)
**Przyczyna:** `DashboardLayout` umieszcza topbar i `<main>` wewnątrz `SidebarInset`, ale `SidebarInset` nie ogranicza swojej wysokości. Scrolluje się cały `<html>` (który ma `overflow-y: scroll`), a `sticky top-0` na topbarze nie działa prawidłowo na iOS Safari w tym kontekście — topbar jedzie razem z contentem.

**Fix:** Dodać `h-dvh overflow-hidden` do `SidebarInset` w `DashboardLayout`, aby scroll odbywał się wewnątrz `<main>`, a topbar pozostał na stałe na górze.

### 2. Treść chowa się za paskiem bocznym
**Przyczyna:** Klasa CSS opisu w `EventCardCompact` (linia 698) jest uszkodzona: `dark:pros overflow-hidden break-wordse-invert` — powinno być `dark:prose-invert overflow-hidden break-words`. Uszkodzona klasa `break-wordse-invert` nie istnieje, więc `break-words` nie działa i długi HTML content (pogrubiony tekst, linki) wymusza szerokość karty poza kontener.

Dodatkowo linia 608 ma potrójne `overflow-hidden overflow-hidden overflow-hidden`.

### 3. Brak overflow protection na tablet (640-1024px)
**Przyczyna:** Reguła `max-width: 100% !important` dla `.prose` i `main` jest ograniczona do `@media (max-width: 640px)`. Na iPadzie (768-1024px) nie działa.

**Fix:** Rozszerzyć breakpoint do 1024px.

## Plan zmian

### Plik 1: `src/components/dashboard/DashboardLayout.tsx`
- `SidebarInset`: dodać `className="flex flex-col flex-1 h-dvh overflow-hidden"` — wymusza scroll wewnątrz main, topbar zawsze widoczny

### Plik 2: `src/components/events/EventCardCompact.tsx`
- **Linia 608:** Usunąć potrójne `overflow-hidden` → zostawić jedno
- **Linia 698:** Naprawić uszkodzoną klasę: `dark:pros overflow-hidden break-wordse-invert` → `dark:prose-invert overflow-hidden break-words`

### Plik 3: `src/index.css`
- **Linia 289:** Zmienić `@media (max-width: 640px)` na `@media (max-width: 1024px)` — rozszerzyć ochronę overflow na tablety

### Audyt Apple — dodatkowe poprawki
Po przeglądzie codebase, główne problemy Apple (touch targets, tap delay, clipboard) są już rozwiązane w poprzednich iteracjach. Jedyne pozostałe problemy to powyższe 3 punkty, które bezpośrednio powodują widoczne na screenshocie usterki.

