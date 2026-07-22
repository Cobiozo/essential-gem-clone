## Cel
Naprawić 3 rzeczy w edytorze `/admin/homepage`, nie ruszając reszty aplikacji:

1. **Przewijanie** — kanwa i inspektor mają płynnie się scrollować.
2. **Spójny styl edytora** — zamiast surowego `bg-neutral-100` + białych paneli, użyć tokenów designu z reszty panelu admina (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `Separator`, cienie i zaokrąglenia jak w innych ekranach admina).
3. **Edytowalne logo w lewym górnym rogu** kanwy V2.

## Co zrobić

### 1. Przewijanie
- `src/pages/admin/HomepageEditor.tsx`: kontener główny zmienić z `h-screen` na `min-h-screen` z sekcją body `flex-1 overflow-hidden`, a wewnątrz nadać `overflow-y-auto` osobno lewej kanwie i prawemu inspektorowi (`h-[calc(100vh-56px)]`), żeby scroll działał niezależnie w obu kolumnach.
- Usunąć/zawęzić `onClick` deselect z zewnętrznego wrappera kanwy (przenieść na dedykowane tło), żeby kliknięcia w scrollbary/marginesy nie gubiły zaznaczenia.

### 2. Spójny design z panelem admina
- Toolbar: zamiast `bg-white shadow-sm` → `bg-card border-b border-border`. Typografia `text-foreground` / `text-muted-foreground`. Przyciski zostają na wariantach shadcn (`default`, `outline`, `ghost`) — usunąć hardcoded klasy `bg-neutral-*`.
- Tło body: `bg-muted/30` (jak inne strony admina) zamiast `bg-neutral-100`.
- Karta kanwy: `bg-background border border-border rounded-lg shadow-sm`.
- Inspektor (`src/components/landing-v2/editor/Inspector.tsx`): sekcje jako `Card`/`Separator` z shadcn, nagłówki `text-xs uppercase tracking-wider text-muted-foreground`, spójne odstępy `space-y-4`, `Label` i `Input` w standardowym rozmiarze reszty admina (bez `h-9 text-xs` wszędzie).
- `StyleControls` i inputy: użyć `Select` z shadcn zamiast natywnego `<select>` (jeżeli obecnie natywny), stała siatka 2-kolumnowa, chip kolorów w `rounded-md border-border`.
- Autosave status → `Badge` variant `secondary`.

### 3. Edytowalne logo (lewy górny róg)
- Rozszerzyć typ `HomepageV2Content` o `header.logo: { url: string; alt: string; heightPx?: number; link?: string }` z domyślną wartością wskazującą aktualny import `logoPurelife`.
- W `src/components/landing-v2/LandingV2.tsx` (linia 131): zastąpić statyczny `<img src={logoPurelife} … />` komponentem `<E path="header.logo" type="logo"><img src={content.header.logo.url || logoPurelife} … /></E>`; wysokość sterowana `heightPx` z fallbackiem `h-14 lg:h-16`.
- W `Inspector.tsx` blok `logo` już istnieje — działa automatycznie po podpięciu ścieżki. Dodać pole `Wysokość (px)` dla logo w headerze.
- Migracja danych: przy pierwszym wczytaniu, jeśli `content.header?.logo` nie istnieje, wypełnić domyślnym obiektem w hooku `useHomepageV2Content` (bez pisania do DB — tylko in-memory fallback, admin zapisze przez „Opublikuj").

## Poza zakresem
- Zawartość V1, routing, inne strony admina, RLS, edge functions.
- Zmiany w logice publish/draft — pozostają bez zmian.

## Weryfikacja
- Otworzyć `/admin/homepage`, sprawdzić scroll kanwy i inspektora niezależnie.
- Kliknąć logo w lewym górnym rogu — otwiera inspektor logo, można podmienić plik i wysokość.
- Zapisać draft, opublikować, otworzyć `/` (variant V2) — logo i style spójne.
