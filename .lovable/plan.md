## Problem

Banner wydarzenia (`paid_events.banner_url`) renderuje się **inaczej** w podglądzie admina i na stronie publicznej, mimo że oba widoki używają tego samego komponentu `PaidEventHero`. Powody:

1. **Niedeterministyczna wysokość heroa** – baner ma `absolute inset-0 h-[300px] md:h-[400px]`, a content `pt-[200px] md:pt-[280px]`. Gdy container ma inną szerokość (admin preview ~50% ekranu vs publiczna full-width), tytuł i meta-info zajmują różną liczbę linijek i baner "wystaje" inaczej.
2. **Brak deterministycznego aspect ratio** – obraz jest skalowany `object-cover` w sztywnym pikselowym pudełku, więc crop zależy od szerokości viewportu. W wąskim podglądzie pokazuje się środek bannera, w szerokim publicznym – inny fragment.
3. **Cache obrazu** – po wgraniu nowego pliku publiczna strona może pokazywać poprzedni baner do czasu invalidacji query.
4. **Gradient overlay** (`from-transparent via-background/60 to-background`) wygląda inaczej w zależności od wysokości containera.

Cel: **to, co admin widzi w podglądzie, ma być dokładnie tym, co widzi użytkownik** – ten sam crop, ta sama wysokość, ta sama kompozycja tytuł/banner.

## Rozwiązanie

Przebudowa `PaidEventHero` tak, by baner miał deterministyczny **aspect ratio** zamiast pikselowej wysokości oraz spójną kompozycję niezależnie od szerokości containera.

### 1. `PaidEventHero.tsx` – nowa kompozycja

- Banner renderowany w kontenerze `aspect-[21/9]` (lub `aspect-[16/6]`) z `max-h-[480px]` – ten sam stosunek boków na każdej szerokości → ten sam crop, ten sam wygląd.
- `object-cover object-center` – stałe pozycjonowanie.
- Tytuł, meta i CTA nakładane jako **overlay** na dolną część bannera (`absolute bottom-0` z gradientem `from-background via-background/80 to-transparent` od dołu) – jednolicie w admin preview i publicznej stronie.
- Gdy nie ma `bannerUrl` – fallback na sekcję bez tła (jak obecnie, ale uproszczony).
- Container wewnątrz overlay zachowuje `container mx-auto px-4` dla zachowania spójnej szerokości tekstu.

### 2. Strona publiczna `PaidEventPage.tsx`

- Usunięcie wszelkich nadmiarowych marginesów/paddingu wokół `<PaidEventHero/>` aby kompozycja była identyczna jak w `EventEditorPreview`.

### 3. Cache busting bannera

W `EventMainSettingsPanel` po zapisie `banner_url` wymusić invalidację query publicznego heroa:
- już istnieje invalidacja `paid-event-preview` – dodać invalidację query dla publicznej strony (klucz wykorzystywany w `PaidEventPage`).
- Opcjonalnie: do `<img src>` w heroku dopinać `?v=` z timestampu `updated_at` event'a aby wymusić odświeżenie obrazu z CDN.

### 4. QA wizualne

Po zmianach porównać:
- `/admin?tab=paid-events` → edytor → zakładka Główne (podgląd po prawej)
- `/events/test-krakow` (publiczna strona)

Oba muszą pokazywać identyczny crop bannera, tę samą wysokość proporcjonalnie, ten sam overlay i położenie tytułu.

## Pliki do edycji

- `src/components/paid-events/public/PaidEventHero.tsx` – przebudowa kompozycji (aspect ratio + overlay)
- `src/pages/PaidEventPage.tsx` – ujednolicenie wrappera wokół heroa (jeśli potrzebne)
- `src/components/admin/paid-events/editor/EventMainSettingsPanel.tsx` – dodanie invalidacji query publicznej strony + cache busting na `updated_at`
- (bez zmian w schemacie bazy)

## Zakres NIE objęty

- Bez nowych pól w bazie (np. fokus punktu obrazu) – jeśli admin chce kontrolować crop, można to dodać w kolejnej iteracji jako `banner_focal_point` (`object-position: X% Y%`).
