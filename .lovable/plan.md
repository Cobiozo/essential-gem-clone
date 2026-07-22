## Cel

Doprowadzić stronę V2 (`/admin/homepage` → wariant „V2 nowa") do wyglądu 1:1 z załączoną makietą, generując brakujące obrazy, ikony i elementy graficzne.

## Zakres zmian (tylko `src/components/landing-v2/*` + nowe assety)

### 1. Wygenerowane assety (imagegen, zapis do `src/assets/landing-v2/`)
- `logo-purelife.png` — logo „PURE LIFE CENTER" ze złotą kroplą (transparent PNG).
- `hero-mockup.png` — kompozycja: srebrny MacBook z dashboardem „Pulpit / Akademia / Webinary…" + iPhone z panelem „Moje cele 78%" na marmurowym stojaku, roślina w tle, złoty łuk dekoracyjny (transparent PNG, premium — zawiera tekst UI).
- `community-hero.jpg` — grupa ludzi od tyłu na tle gór o zachodzie słońca, ręce uniesione.
- `avatars-1..5.jpg` — 5 okrągłych portretów do social proof (spójny, ciepły ton).
- Logotypy „ZAUFALI NAM": `logo-eqology.png`, `logo-goed.png`, `logo-msc.png`, `logo-gmp.png`, `logo-arctic-oil.png` (transparent PNG, monochrom szary/złoty — jako stylizowane badge'y wzorowane na makiecie; nie kopie prawdziwych znaków towarowych).
- Ikony sekcji „Co zyskujesz": złote, cienkie, kreskowe (Zdrowie=serce z pulsem, Akademia=biret, Webinary=play w kwadracie, Społeczność=grupa, Cele=tarcza) — użyjemy `lucide-react` (`HeartPulse`, `GraduationCap`, `PlaySquare`, `Users`, `Target`) w złotym kolorze `#B8894A`, `strokeWidth={1.25}`. Bez generowania.
- Ikony statystyk: `Users`, `BookOpen`, `UserRound`, `Clock` (lucide, złote, cienkie).
- Ikony listy korzyści: `CheckCircle2` (lucide, złoty wypełniony).

### 2. Refaktor komponentów V2 (piksel-perfect wg makiety)

**`LandingV2.tsx`** — biały background, złoty akcent `#B8894A`, czarne nagłówki `#111`.

- **Hero (split 50/50, min-h ~ekranu)**
  - Lewa kolumna: logo góra, mały eyebrow „TWOJE CENTRUM" (letter-spacing), H1 3-liniowy: „Zdrowie." / „Wiedza." / „Więcej życia." (ostatnia linia w złocie), lead paragraf 2 linie, dwa CTA (złoty pełny „Dołącz do społeczności →" + ghost z ikoną play „Zobacz jak działa"), social proof: 4 nakładające się awatary + tekst „Dołączyło już ponad 1200 osób…".
  - Prawa kolumna: `hero-mockup.png` wyrównany do prawej krawędzi, wystający poza kontener; delikatny złoty łuk SVG w tle.
- **Features** — eyebrow „CO ZYSKUJESZ?" + H2 „Wszystko, czego potrzebujesz w jednym miejscu"; 5 kart w rzędzie (grid 5-col desktop, 2-col tablet, 1-col mobile), tło `#FBF8F3`, `rounded-2xl`, ikona w kółku, tytuł, opis 3 linie.
- **Stats** — jasny pasek `rounded-2xl` z 4 kolumnami (ikona + duża liczba złota + 2 linie opisu), separatory pionowe.
- **Community** — split 40/60: lewa kolumna eyebrow „RAZEM MOŻEMY WIĘCEJ" + H2 2-liniowy + 4 punkty z checkiem + CTA „Zacznij swoją zmianę →"; prawa kolumna zdjęcie `community-hero.jpg` `rounded-2xl` z overlay: duży okrągły przycisk play + tekst „Zobacz jak nasza społeczność…" + stack awatarów „+1200 osób".
- **Trusted by** — eyebrow „ZAUFALI NAM" + rząd 5 logotypów wyszarzonych, wyśrodkowany.

Wszystkie teksty, obrazy, ikony pozostają edytowalne w `HomepageEditor` (kontrakt JSON się nie zmienia — dodane tylko nowe pola `heroImage`, `communityImage`, `avatars[]`, `trustedLogos[]` w `homepage_v2_content` seedowane wartościami z assetów).

### 3. Migracja treści
- Uzupełnić `homepage_v2_content` domyślnymi ścieżkami do nowych assetów przez upsert w SQL migracji (URL-e wskazujące na zbudowane assety po deploy — użyjemy relatywnych importów w komponencie, więc DB przechowuje tylko teksty + opcjonalne overrides URL).

## Szczegóły techniczne
- Kolory: `--gold: #B8894A`, `--gold-soft: #D4A574`, `--ink: #111111`, `--bg: #FFFFFF`, `--surface: #FBF8F3`.
- Typografia: nagłówki `font-serif`? Makieta używa modern sans (podobnie do Inter/Manrope) — zastosuję `font-sans` z `tracking-tight` i `font-semibold`; ostatnia linia H1 w kolorze złotym.
- Obrazy generowane: `premium` dla `hero-mockup` (UI tekst), `standard` dla `community-hero` i awatarów, `premium` transparent PNG dla logotypów.
- Brak zmian w routingu, DB schema, auth, ani innych stronach.

## Poza zakresem
- Zmiany w wariancie V1.
- Zmiany logiki przełącznika V1/V2.
- Zmiany w panelu admin (edytor nadal działa 1:1 na tej samej strukturze JSON, dochodzą tylko opcjonalne pola image override).
