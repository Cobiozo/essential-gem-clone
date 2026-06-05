## 1) Archiwum miesięczne (prawa kolumna na /aktualnosci)

- W `src/pages/NewsHubPage.tsx` zmiana layoutu listy na 2-kolumnowy grid: `lg:grid-cols-[1fr_260px]` (lista lewo, archiwum prawo). Mobile: archiwum pod listą.
- Nowy komponent `src/components/news-hub/NewsHubArchive.tsx`:
  - Z `posts` liczy `rok-miesiąc → liczba` po `created_at`.
  - Renderuje nagłówek „Archiwum" + linki typu „Marzec 2023 · 4", sortowane malejąco.
  - Klik ustawia filtr `monthKey` (`YYYY-MM`). Aktywny miesiąc wyróżniony kolorem `primary`. Przycisk „Wyczyść".
  - Sticky `top-20`, styl spójny z dark theme aplikacji (akcent primary/żółty, BEZ fioletu — screen jest tylko inspiracją układu).
- W `NewsHubPage.tsx` dodać `monthKey` state i filtr w `useMemo`. Gdy `monthKey` ustawiony, dropdown „Rok" auto-synchronizuje się do roku miesiąca.

## 2) Podgląd banera = realny render strony

- W `src/components/admin/news-hub/NewsHubBannerEditor.tsx` lewa kolumna ma renderować podgląd bez sztucznego przycinania (obecnie obcina banner po prawej).
- `NewsHubBanner` dostaje prop `embedded?: boolean`, który pomija wewnętrzny `container max-w-7xl mx-auto px-4 ...` — w podglądzie banner wypełnia całą szerokość kolumny i wygląda identycznie jak po wejściu na `/aktualnosci` (z zachowaniem proporcji, fit, position, overlay, animacji tekstu).
- Wrapper podglądu: `w-full overflow-hidden rounded-xl border border-border bg-background`.

## 3) Ukrycie panelu zarządzania ze strony /aktualnosci

- Usunąć z `NewsHubPage.tsx`:
  - `GridLayoutSwitcher` (ikonki układu na screenie #3).
  - Hint dla admina: „Najedź na kafelek, aby zobaczyć szybkie akcje…".
- `BentoGrid` dostaje prop `adminActions?: boolean` (default `false`). Quick-actions (pin/edit/hide/delete na hover) renderowane tylko gdy `true`. Na `/aktualnosci` przekazujemy `false`.
- Wszystkie te narzędzia są nadal dostępne po wejściu w „Zarządzaj" (`/admin/news-hub`), gdzie `GridLayoutSwitcher` już istnieje w sekcji „Domyślny układ listy", a akcje są w tabeli postów.

## Pliki

- Nowy: `src/components/news-hub/NewsHubArchive.tsx`
- Edytowane: `src/pages/NewsHubPage.tsx`, `src/components/news-hub/NewsHubBanner.tsx`, `src/components/admin/news-hub/NewsHubBannerEditor.tsx`, `src/components/news-hub/BentoGrid.tsx`

## Bez zmian

- Schemat bazy (`news_hub_posts.created_at` wystarcza do grupowania).
- Logika `useNewsHub.ts`, uploady, design samego banera.
