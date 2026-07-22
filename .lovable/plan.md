## Zakres
Naprawa edytora `/admin/homepage` (V2) — tylko frontend, bez zmian w backendzie:

1. Wideo w sekcji „Dołącz do ludzi…" — realne odtwarzanie zamiast tylko linku.
2. Edytowalne logo certyfikatów na dole (sekcja „ZAUFALI NAM").
3. Tryb **drag & drop + resize** dla dowolnego elementu na kanwie.

---

## 1. Wideo w sekcji Community

Obecnie `community.videoUrl` służy tylko jako link pod ikonką „Play". Rozszerzam:

- W `src/types/homepageV2.ts` dodaję do `community` pola: `videoUrl` (już jest), `videoPoster?: string`, `videoAutoplay?: boolean`.
- W `src/components/landing-v2/LandingV2.tsx` sekcja community: gdy `videoUrl` jest ustawione, renderuję właściwy odtwarzacz zamiast tła:
  - MP4/WebM (`/uploads/...` lub `.mp4`) → `<video controls playsInline preload="metadata" poster={videoPoster || backgroundImage}>` z `<source type=...>` (używam istniejącego `videoMime`).
  - YouTube/Vimeo → `<iframe>` z odpowiednim embed URL (parser `youtu.be`, `youtube.com/watch?v=`, `vimeo.com/...`).
  - Fallback (brak `videoUrl`) → obecny obraz + ikonka Play.
- Overlay z tekstem i awatarami pozostaje, ale ukrywa się gdy realny odtwarzacz jest aktywny (nie przykrywa kontrolek).
- W `src/components/landing-v2/editor/Inspector.tsx`, dla `type='video'`, dodaję:
  - `ImageInput` „URL wideo (MP4 lub YouTube)" z możliwością **wgrania pliku** (reuse istniejącego uploadu do `cms-images` bucket, po prostu przyjmuje też `.mp4/.webm`).
  - Pole `Poster (miniatura)` (ImageInput).
  - Checkbox `Autoodtwarzanie (wyciszone)`.
- W `src/pages/admin/HomepageEditor.tsx` w handlerze uploadu dopuszczam `video/*` (obecnie prawdopodobnie tylko `image/*`).

## 2. Edytowalne logo certyfikatów (ZAUFALI NAM)

Problem: gdy `trustedBy.logos` jest puste, render używa hardkodowanych `<TrustedBadge>` które nie są opakowane w `<E>` — nie da się ich kliknąć.

Rozwiązanie:

- W `src/hooks/useHomepageConfig.ts` (fallback dla `HomepageV2Content`) — jeśli `trustedBy.logos` jest puste/undefined, wypełniam domyślną listą 5 logotypów (Eqology, GOED, MSC, GMP, Arctic Oil) używając już wygenerowanych plików w `src/assets/landing-v2/` (jeśli istnieją; jeśli nie — dodaję puste `url:''` żeby admin od razu miał 5 kart do wgrania obrazów).
- W `LandingV2.tsx` sekcja trusted-by: zawsze renderuję mapę `trustedBy.logos.map(...)`. Puste `url` pokazuję jako placeholder (`bg-neutral-100 border-dashed` z etykietą „Wgraj logo") — nadal klikalne, otwiera Inspector dla `trustedBy.logos[i]`. Usuwam kompletnie gałąź `TrustedBadge`.
- W Inspectorze `type='logo'` już mamy pola URL/alt/link/wysokość (px). Dodaję `AddSiblingButton` (już obsługuje `endsWith('logos')`) — czyli będzie „Dodaj element do listy".
- Aktualne pole „Wysokość (px)" faktycznie stosujemy w `img` (obecnie klasa `h-10 lg:h-12` jest hardcoded — nadpisuję inline `style={{ height: logo.heightPx ? logo.heightPx : undefined }}` gdy ustawione).

## 3. Drag & drop + resize dowolnego elementu

Rozszerzam istniejący system `styles[path]` o transform pozycji i rozmiaru — bez zmian w schemacie DB (styles to swobodny JSON):

- `src/types/homepageV2.ts` — rozszerzam `ElementStyle` o: `offsetX?: number`, `offsetY?: number` (px, `transform: translate`), `scale?: number`, `width?: string`, `height?: string`, `zIndex?: number`.
- Nowy komponent `src/components/landing-v2/editor/EditOverlay.tsx`:
  - Renderowany przez `<E>` **tylko w trybie edytowalnym** dla zaznaczonego elementu.
  - Uchwyty: 8 punktów resize (rogi + boki) + uchwyt „move" na środku.
  - Pointer events: `pointerdown` → zapamiętuje start (x, y, rect), `pointermove` → wylicza deltę względem najbliższego kontenera sekcji i wywołuje `updateStyle(path, { offsetX, offsetY, width, height })`, `pointerup` → uwalnia. Debounce autosave (już istnieje w `HomepageEditor`).
  - Shift = proporcjonalny resize, Alt = symetryczny względem środka.
- `<E>` (wrapper w `LandingV2.tsx`): aktualnie renderuje dziecko z outline. Zmieniam tak, żeby w trybie `editable` opakowywał dziecko w `<span/div style={{ display:'inline-block', transform: translate(x,y) scale(s), width, height }}>` i renderował `EditOverlay` dla `selectedPath === path`.
- Reset: w Inspectorze dodaję sekcję „Pozycja i rozmiar" z polami `offsetX/Y`, `width`, `height`, `scale`, `zIndex` + przycisk „Zresetuj położenie".
- Publikacja: nic nie dodajemy — `styles` już zapisuje się do `homepage_v2_content.content` w Supabase.

### Uwaga do UX

- Drag jest opt-in per element — bez zaznaczenia layout pozostaje w standardowej siatce (dla użytkowników nieedytujących nic się nie zmienia).
- Poza edytorem (`editable=false`) style pozycji nadal są stosowane, więc to co admin poprzesuwa, widzą wszyscy odwiedzający.
- Na mobile edytora (device=`mobile`) drag też działa, ale zapisane offsetsy są wspólne dla obu widoków (informacja w Inspectorze).

## Poza zakresem
- Nowe schematy DB, RLS, edge functions.
- V1, routing, inne strony admina.
- Wersjonowanie draftów, undo/redo poza istniejącym „Odrzuć zmiany".

## Weryfikacja
- `/admin/homepage`: klik w miejsce wideo → w Inspectorze wgrywam MP4 → w podglądzie leci film z kontrolkami. Publikacja → `/` (V2) pokazuje ten sam film.
- Sekcja „ZAUFALI NAM": klik w dowolny znaczek certyfikatu → Inspector, wgrywam PNG/SVG, ustawiam wysokość, opcjonalny link. Mogę dodać/usunąć/duplikować logo.
- Zaznaczam nagłówek hero → chwytam za środek i przesuwam o 40 px w prawo → puszczam → zapisuje się w draft → po odświeżeniu pozycja zachowana. Za róg zmieniam rozmiar → skalowanie działa.
