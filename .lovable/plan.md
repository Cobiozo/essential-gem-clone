# Plan: Pasek V1 na V2 + panel widżetów w edytorze V2

## 1. Wspólny pasek górny (Header V1 na stronie V2)

- W `src/components/landing-v2/LandingV2.tsx`:
  - Zaimportować `Header` z `@/components/Header`, `usePublishedPages` i `useSystemTexts` (tak jak w `src/pages/Index.tsx`).
  - Wyliczyć `siteLogo` z `system_texts` (fallback do `newPureLifeLogo`).
  - Wyrenderować `<Header siteLogo={siteLogo} publishedPages={publishedPages} />` na samej górze layoutu (nad hero), tak samo w trybie publicznym jak i edytora — dokładnie ten sam komponent i te same źródła danych co V1, więc logo, przełącznik motywu, wybór języka i przycisk „Zaloguj się" wyglądają identycznie.
  - Usunąć obecny własny mini‑header V2 (jeżeli jego elementy powielają się z `Header`), tak żeby edytowalne pozostały tylko sekcje treści.
- Uwaga: `Header` jest źródłem systemowym (edytowany globalnie w panelu admina), więc w edytorze V2 nie będzie klikalny — to zgodne z V1.

## 2. Panel „Widżety" w edytorze V2 (dodawanie bloków)

Model danych — nowy dynamiczny obszar treści (nie ruszamy istniejących sekcji hero/community/trustedBy):

- W `src/types/homepageV2.ts` dodać:
  - `WidgetKind = 'container' | 'grid' | 'section' | 'collapsible' | 'heading' | 'text' | 'image' | 'video' | 'button' | 'icon' | 'divider' | 'spacer' | 'card' | 'stat' | 'bullet-list' | 'logo-row'`.
  - `Widget { id: string; kind: WidgetKind; props: Record<string, any>; children?: Widget[]; style?: ElementStyle }`.
  - Rozszerzenie `HomepageV2Content` o `widgets?: Widget[]` (opcjonalne, wstecznie kompatybilne — istniejące strony nadal działają).
- W `useHomepageConfig.ts` (`withDefaults`) zapewnić `content.widgets ??= []`.

Renderer widżetów:

- Nowy plik `src/components/landing-v2/widgets/WidgetRenderer.tsx` renderujący listę `Widget[]` po `kind`, każdy wrappowany w `<E path="widgets.{i}" type="...">` — dziedziczy istniejący system zaznaczania, drag/resize i style overrides.
- W `LandingV2.tsx` po wyrenderowaniu istniejących sekcji dodać `<WidgetRenderer widgets={content.widgets || []} basePath="widgets" />` (osobna „strefa widżetów" dopinana na dole strony — dla V2 to naturalne miejsce rozbudowy).

Panel widżetów w Inspectorze:

- W `src/components/landing-v2/editor/Inspector.tsx` dodać zakładki na górze: **Widżety** | **Globalne** | **Właściwości** (Właściwości = obecny widok wybranego elementu).
- Nowy komponent `src/components/landing-v2/editor/WidgetPalette.tsx`:
  - Zorganizowany w grupy zgodne ze zrzutem: **Układ** (Kontener, Siatka, Pure Life, Sekcja zwijana, Sekcja) i **Podstawowe** (Nagłówek, Tekst, Obraz, Wideo, Przycisk, Ikona, Karta, Statystyka, Punkt listy, Logo, Divider, Spacer, Avatar) — łącznie ~13 podstawowych.
  - Pole „Szukaj widżetu…", grupy zwijane, karty z ikoną Lucide + nazwą.
  - Kliknięcie karty = `addWidget(kind)` → dopisuje nowy `Widget` z sensownym `props` domyślnym na koniec `content.widgets` (lub do zaznaczonego kontenera, jeśli zaznaczony jest kontener/siatka/sekcja).
- „Globalne" (drugi tab) — miejsce na późniejsze globalne style (kolory, typografia); w tej iteracji placeholder informacyjny (bez logiki).

Właściwości widżetu:

- Gdy zaznaczony `selectedPath` zaczyna się od `widgets.` — Inspector renderuje edytor właściwości zależny od `kind` (tekst, url, obraz, wideo, ikona, kolumny siatki, tytuł sekcji zwijanej itp.), plus istniejące `StyleControls` i `LayoutControls`.
- Akcje na widżecie: Duplikuj, Usuń, ↑/↓ (kolejność), zagnieżdżanie w kontenerach jest w scopie tej iteracji tylko dla `container` / `grid` / `section` / `collapsible` (dodawanie dzieci przez „Dodaj widżet do…" gdy taki kontener jest zaznaczony).

Utility:

- W `src/components/landing-v2/editor/pathUtils.ts` dodać `addWidget`, `removeWidget`, `duplicateWidget`, `moveWidget` operujące na `content.widgets` i ścieżkach `widgets.{i}.children.{j}...`.

## 3. Publikacja / draft

Bez zmian — nowe pole `widgets` zapisuje się w istniejącym `draft_content` / `content` (`homepage_v2_content`). Undo/redo i autosave już obsługują dowolny kształt `HomepageV2Content`.

## 4. Zakres poza planem (do potwierdzenia w kolejnej iteracji)

- Drag‑and‑drop widżetów między kontenerami z palety (na razie: klik = dodaj na koniec, potem można przesuwać strzałkami i pozycją X/Y jak dziś).
- Zakładka „Globalne" z realnymi globalnymi tokenami (kolory/typografia dla V2).

## Szczegóły techniczne

- Wszystkie kolory/style widżetów przez tokeny Tailwind/CSS zmienne — bez `text-white` itp.
- `Header` zaimportowany bez modyfikacji, żeby zmiany w V1 automatycznie propagowały się na V2.
- Nowe pola w `HomepageV2Content` są opcjonalne — brak migracji SQL.
- Renderer widżetów używa istniejącego `<E>` wrappera, więc zaznaczanie, hover outline, drag/resize i style overrides działają od razu.
