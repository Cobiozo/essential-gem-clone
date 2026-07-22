## Zakres
Naprawa edytora `/admin/homepage` (V2) — bez wpływu na V1. Wszystkie zmiany dotykają wyłącznie plików V2 (`LandingV2.tsx`, `HomepageEditor.tsx`, `Inspector.tsx`, `homepageV2.ts`, `useHomepageConfig.ts`, `HomepageSwitcher.tsx`) oraz nowych plików w `src/components/landing-v2/`. **Nie modyfikuję** komponentów V1 (`src/components/landing/*`, `Index.tsx`, ani żadnego innego pliku poza gałęzią V2).

Separacja V1/V2:
- `HomepageSwitcher` pozostaje jedynym punktem wyboru — logika bez zmian.
- Migracje typów (`CtaConfig`, `HeroMedia`) uruchamiają się tylko w `withDefaults` dla `homepage_v2_content`; V1 czyta własne źródło i nie widzi nowych pól.
- Zero zmian w schemacie DB — wszystko w JSON `homepage_v2_content.content`.

---

## 1. Edycja przycisków (CTA) — naprawa zapisu

Obecnie Inspector zapisuje np. `hero.primaryCta.text`, a schemat ma płaskie `hero.primaryCtaText` / `hero.primaryCtaUrl`. Efekt: zmiany „idą w próżnię".

- `src/types/homepageV2.ts` — nowy typ `CtaConfig { text: string; url: string; kind?: 'external' | 'route' | 'anchor'; }`. `hero.primaryCta / secondaryCta` i `community.cta` migrowane do `CtaConfig`. Stare pola płaskie zostają jako `@deprecated` do czytania, żeby nic nie zniknęło publicznie.
- `useHomepageConfig.ts` → `withDefaults`: jeżeli w treści są stare klucze płaskie, mapuję je jednorazowo do nowych obiektów (bez zapisu do bazy, tylko w pamięci; zapis nastąpi przy następnej edycji admina). Bezpieczne dla starych rekordów.
- `LandingV2.tsx`: czyta wyłącznie z nowych `CtaConfig`.
- `Inspector.tsx` (`type='button'`): edytuje `text` / `url` / `kind`. Zapis w jedno miejsce (`updateAtPath(hero.primaryCta, {...})`).

## 2. Wybór miejsca docelowego przycisku (route/anchor picker)

- Inspector przycisku dostaje select z trzema trybami:
  - **Zewnętrzny URL** — free-input (jak dziś).
  - **Trasa aplikacji** — lista z `KNOWN_APP_ROUTES` (`/`, `/auth`, `/dashboard`, `/webinary`, `/aktualnosci`, `/baza-wiedzy`, `/kontakt`, itd. — te już istniejące w routingu, bez dodawania nowych).
  - **Kotwica na stronie V2** — lista sekcji: `#hero`, `#features`, `#stats`, `#community`, `#trusted-by`. Do sekcji dodaję w `LandingV2.tsx` odpowiednie `id`.
- Zapis to zawsze finalny `url` (`/webinary` lub `#features`) + `kind` (informacyjne). Nic nie wymaga backendu.

## 3. Wideo w Hero (mockup)

- `src/types/homepageV2.ts` — nowy `HeroMedia { kind: 'image' | 'video'; imageUrl?: string; videoUrl?: string; videoPoster?: string; videoAutoplay?: boolean; }`. `hero.media` z fallbackiem z `hero.mockupImage` (migracja czytana w `withDefaults`).
- `LandingV2.tsx` sekcja hero: jeżeli `media.kind==='video'` → analogiczny render jak w Community (MP4/WebM z `<source type>` przez `videoMime`, YouTube/Vimeo → iframe). Inaczej obraz jak dziś.
- Inspector dla hero mockup: przełącznik `Obraz / Wideo`, pola URL + upload (reuse istniejącego uploadu z community — akceptuje `image/*` i `video/*`) + poster + autoplay.

## 4. Responsywność (mobile/tablet)

Poprawki wyłącznie w `LandingV2.tsx` (Tailwind, bez zmian struktury):
- Kontenery: `px-4 sm:px-6 lg:px-8`, `max-w-7xl mx-auto`.
- Hero: `text-4xl sm:text-5xl lg:text-7xl`, mockup przechodzi pod tekst na `< lg`, awatary zawijane.
- Features: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`, karty mają jednolitą wysokość.
- Stats: `grid-cols-2 lg:grid-cols-4`.
- Community: obraz/wideo na całą szerokość na mobile, tekst pod spodem.
- Trusted-by: `flex-wrap justify-center gap-6`, logotypy z `max-h-10 sm:max-h-12`.
- Sticky editor toolbar dostaje `flex-wrap`, żeby na wąskim canvasie nie łamał się horyzontalnie.

## 5. Undo / Redo

W `HomepageEditor.tsx`:
- Historia w `useRef<{ past: HomepageV2Content[]; future: HomepageV2Content[] }>`, limit 50 wpisów.
- `pushHistory(prev)` wołane w `handleChange` i `handleUpdateStyle` **przed** mutacją (debounce 400 ms, żeby wpis tekstu nie rozdrabniał historii).
- Toolbar: dwa przyciski `Undo` / `Redo` (lucide `Undo2` / `Redo2`) obok „Odrzuć zmiany". Skróty `Ctrl/Cmd+Z` i `Ctrl/Cmd+Shift+Z` — listener na `window`, ignorowany gdy focus w `input/textarea/[contenteditable]`.
- Undo/Redo modyfikuje `working` i ustawia `dirtyRef=true`, więc auto-zapis draftu działa normalnie. Historia trzymana wyłącznie w pamięci sesji edytora (bez DB).

---

## Poza zakresem

- V1 (`src/components/landing/*`, stary `Index`), routing, inne strony admina.
- Zmiany w bazie danych, RLS, edge functions.
- Wersjonowanie draftów po stronie serwera, wieloosobowa historia.

## Weryfikacja

- Zmiana tekstu/URL przycisku w Inspectorze → od razu widać w podglądzie, po publikacji obecne na `/` (V2).
- Wybór „Trasa aplikacji → /webinary" → kliknięcie CTA prowadzi do `/webinary`; „Kotwica → #features" → smooth-scroll do sekcji.
- Hero z trybem „Wideo": wgranie MP4 pokazuje player z kontrolkami; wklejenie linku YouTube → iframe.
- Widok mobile (canvas 430 px) i tablet (~ 768 px): brak przepełnień, features układają się w 1–2 kolumny, trusted-by zawija.
- `Ctrl+Z` cofa ostatnią edycję (tekst/kolor/pozycja), `Ctrl+Shift+Z` przywraca. Przyciski w pasku aktywne/nieaktywne w zależności od historii.
- `/` z aktywnym wariantem V1 wygląda i działa identycznie jak przed zmianami (regresja zero).
