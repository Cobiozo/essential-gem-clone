## Cel

Skrócić czas, po którym widać wideo w aplikacji (News Hub, posty, bloki, modale, intro), oraz przy okazji wyeliminować nadmiarowe pobieranie danych CMS i obrazów w galeriach News Hub.

## Diagnoza (skąd bierze się „wolne wideo")

1. `NewsHubVideoPlayer` montuje `<video src=...>` od razu po renderze posta/modala — przeglądarka zaczyna ściągać metadane (a często i pierwsze segmenty) wideo **zanim użytkownik kliknie play**. Gdy w widoku jest kilka postów wideo (Bento Grid, lista, modal), bandwidth jest dzielony i każdy klip startuje wolniej.
2. Brak `poster` na większości starszych wideo → przeglądarka musi zdekodować pierwszą klatkę, żeby cokolwiek pokazać (dodatkowe range requesty).
3. Wideo serwowane wprost z bucketu Supabase / VPS, bez wstępnego „rozgrzania" (brak `<link rel="preconnect">` do hosta wideo na pierwszym renderze).
4. `VideoFrameCapturePicker` używa `preload="auto"` — w edytorze to OK, ale potwierdza, że gdzie indziej `metadata` to właściwy wybór.

## Zakres zmian

### A. Wideo — lazy player z plakatem (główny zysk)

Nowy komponent-wrapper `LazyVideoPlayer` (cienka nakładka na `NewsHubVideoPlayer`):

- Domyślnie renderuje **tylko obrazek-plakat** (`poster` / `cover_url`) z przyciskiem ▶ na środku, w tym samym kontenerze `aspect-video`. Brak `<video>` w DOM → 0 bajtów wideo.
- Po kliknięciu ▶ podmienia się na pełny `NewsHubVideoPlayer` z `autoplay` (atrybut przekazywany przez prop) — użytkownik nie musi klikać drugi raz.
- Jeśli `poster` nie jest dostępny: pokazuje neutralny placeholder z ikoną play (bez ściągania wideo).
- Dla YouTube/Vimeo używa lekkiego thumbnaila (`https://img.youtube.com/vi/{id}/hqdefault.jpg`) zamiast od razu osadzać iframe — duża oszczędność, bo iframe YT to ~1MB JS.
- `IntersectionObserver` z `rootMargin: 200px`: jeśli kafelek wideo wjeżdża w viewport, dodaje `<link rel="preconnect" href="{origin}">` żeby skrócić TTFB pierwszego segmentu po kliknięciu play.

Miejsca, które przełączymy na `LazyVideoPlayer`:

- `src/components/news-hub/PostContent.tsx` (post `video` + bloki `video`)
- `src/components/news-hub/PostDetailModal.tsx` (poster z `post.cover_url`)
- `src/components/news-hub/BlockRenderer.tsx` (blok video w renderze listy)

**Nie ruszamy** odtwarzaczy w spotkaniach/WebRTC (`VideoGrid`, `MeetingLobby`), Auto-Webinaru ani `IntroVideoStage` — tam wideo musi startować automatycznie z innych powodów, a dotykanie ich może rozbić synchronizację.

### B. Poster jako fallback dla istniejących wideo bez okładki

`NewsHubVideoPlayer` dla pliku hostowanego dostaje atrybut `preload="none"` zawsze, gdy `poster` istnieje (i tak nic nie zobaczymy poza plakatem). Bez `poster` zostawiamy `metadata`. To skraca pierwszy fetch o ~kilkaset KB na każde wideo w kafelkach.

### C. Cache CMS w React Query (drugi temat z odpowiedzi)

W hookach które ciągle pobierają to samo z `cms_sections` / `cms_items` / `cms_*_translations` ustawiamy spójne czasy cache wzorowane na istniejących (`usePublishedPages`, `useSystemTexts` używają już 5min/30min):

- `useCMSTranslations` i `useCMSSectionTranslations` → dorzucamy `useQuery` z `staleTime: 5min`, `gcTime: 30min` (zamiast surowego `useEffect` na każdy montaż komponentu).
- Walidujemy że hooki listujące posty News Hub w `useNewsHub` mają sensowny `staleTime` (≥60s) — jeśli nie, podnosimy.

To nie zmienia logiki biznesowej, tylko ogranicza powielone zapytania przy nawigacji między zakładkami.

### D. Lazy loading + paginacja galerii News Hub

W `BlockRenderer.tsx` (`GalleryGrid`) i w karcie posta typu galeria:

- Wszystkie `<img>` dostają `loading="lazy"` i `decoding="async"` (jeśli jeszcze nie mają).
- Dodajemy paginację „pokaż więcej" co 12 obrazów: pierwsze 12 jest renderowane od razu, kolejne po kliknięciu w przycisk pod galerią. Lightbox dalej widzi pełną listę (nawigacja strzałkami między wszystkimi zdjęciami).

## Sekcja techniczna

Nowy plik:

- `src/components/news-hub/LazyVideoPlayer.tsx`
  - Props: `url, poster?, className?, autoPlayOnReveal?: boolean (default true)`.
  - Stan `revealed: boolean`. Dopóki `!revealed` renderuje `<button>` z `<img>` plakatem + ikoną `Play` (semantyczny `aria-label="Odtwórz wideo"`).
  - Po `revealed` renderuje `<NewsHubVideoPlayer url={url} poster={poster} />` i — jeśli plik hostowany — przekazuje nowo dodany prop `autoPlay` (rozszerzamy `NewsHubVideoPlayer` o `autoPlay?: boolean`, mapujemy na `autoPlay muted={false}` na elemencie `<video>`; YouTube/Vimeo dostają `?autoplay=1` w URL iframe).
  - YouTube/Vimeo thumbnaile: helper `getThumbnail(url)` w tym samym pliku.

Zmiany w istniejących plikach:

- `src/components/news-hub/NewsHubVideoPlayer.tsx`
  - Dodać prop `autoPlay?: boolean`.
  - Logika `preload`: `poster ? 'none' : 'metadata'`.
  - YouTube/Vimeo iframe URL: doklejać `autoplay=1` gdy `autoPlay`.
- `src/components/news-hub/PostContent.tsx`, `PostDetailModal.tsx`, `BlockRenderer.tsx`
  - Podmiana `NewsHubVideoPlayer` → `LazyVideoPlayer` w renderze treści (edytor zostawiamy bez zmian).
- `src/hooks/useCMSTranslations.ts` i `src/hooks/useCMSSectionTranslations.ts`
  - Przepisać z `useEffect/useState` na `useQuery` (`queryKey: ['cms-item-translations', languageCode, sortedIds]`, `staleTime: 5*60_000`, `gcTime: 30*60_000`, `enabled: languageCode !== defaultLanguage && ids.length > 0`).
- `src/components/news-hub/BlockRenderer.tsx` (`GalleryGrid`)
  - Stan `visibleCount`, początkowo 12. Renderuje `images.slice(0, visibleCount)`. Pod gridem przycisk „Pokaż więcej" zwiększający o 12; znika gdy `visibleCount >= images.length`. Lightbox dostaje pełne `images` i działający `openIndex` względem pełnej listy.
  - Atrybuty `loading="lazy" decoding="async"` na każdym `<img>`.

```text
Karta posta video                         Po kliknięciu ▶
┌──────────────────────────┐              ┌──────────────────────────┐
│        [poster.jpg]      │   click ▶    │       <video autoplay>   │
│            ▶             │ ───────────► │     ◀  ━━━●━━━  ▶ ⛶      │
│  (0 bajtów wideo w DOM)  │              │  (pełny range request)   │
└──────────────────────────┘              └──────────────────────────┘
```

## Czego NIE robię w tej iteracji

- Nie kompresuję ani nie transkoduję wideo (to wymaga osobnej dyskusji o pipeline'ie, np. ffmpeg na VPS).
- Nie podpinam CDN-a przed Supabase Storage.
- Nie ruszam Auto-Webinaru, spotkań WebRTC, IntroVideo, AutoWebinarEmbed.
- Nie wdrażam SWR (zostajemy przy React Query, który już jest standardem projektu).

## Plik testowy / weryfikacja

Po wdrożeniu sprawdzimy w `browser--performance_profile` na `/aktualnosci`:
- LCP karty wideo: oczekiwane <2,5s vs obecne (poster zamiast `<video>`).
- Network: brak żądań do plików `.mp4` przed kliknięciem ▶.
- Po kliknięciu ▶ pierwszy `Range: bytes=0-` powinien startować z `preconnect` już otwartym.
