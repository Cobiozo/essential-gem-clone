# Okładka (poster) dla wideo w News Hub

Aktualnie po wgraniu pliku MP4 wideo nie ma żadnej okładki — odtwarzacz pokazuje czarny ekran z przyciskiem play. Dodaję możliwość wskazania okładki **przed zapisaniem** posta/bloku, na dwa sposoby:

1. **Wgraj obrazek** (JPG/PNG) jako okładkę,
2. **Wybierz klatkę z wideo** — suwakiem przewijasz film, klikasz „Użyj tej klatki", system zapisuje stop-klatkę jako obrazek-okładkę.

## Gdzie pojawi się nowa kontrolka

Dwa miejsca w edytorze News Hub, oba dla treści wideo:

- **Post typu „Wideo"** (`MediaControls.tsx`, `draft.type === 'video'`) — sekcja „Wideo" w formularzu posta.
- **Blok „Wideo"** wewnątrz posta zbudowanego z bloków (`BlockListEditor.tsx`, `case 'video'`).

W obu miejscach, **pod polem URL/upload wideo**, pojawia się nowa sekcja „Okładka wideo" z dwoma przyciskami:

- `Wgraj okładkę` — standardowy input file (image/*) → upload do bucketu News Hub (folder `covers`) → zapis URL w polu poster.
- `Wybierz klatkę z wideo` — otwiera modal z odtwarzaczem, suwakiem czasu i przyciskiem „Użyj tej klatki".

Po wybraniu okładki: miniatura + przycisk „Usuń okładkę".

## Modal wyboru klatki

Nowy komponent `src/components/news-hub/VideoFrameCapturePicker.tsx`:

- `Dialog` (shadcn) z `<video src={videoUrl} crossOrigin="anonymous" preload="auto">`.
- Suwak (`<input type="range">`) od 0 do `duration`, krok 0.1s; pokazuje aktualny czas (mm:ss.cc).
- Skróty: ←/→ = ±1s, Shift+←/→ = ±5s.
- Przycisk **„Użyj tej klatki"** → renderuje `<video>` na `<canvas>` w natywnej rozdzielczości, `canvas.toBlob('image/jpeg', 0.9)` → upload przez istniejące `uploadNewsHubFile(blob, 'covers', { kind: 'cover' })` → callback z URL → modal się zamyka, ustawia poster.
- Obsługa CORS: wideo zostało wgrane do tego samego bucketu Supabase (publiczny URL) — `crossOrigin="anonymous"` powinno działać, ale jeśli `toDataURL/toBlob` rzuci `SecurityError`, pokazuję toast „Nie można pobrać klatki z zewnętrznego wideo (CORS) — wgraj okładkę ręcznie".
- Dla YouTube/Vimeo (iframe) **przycisk „Wybierz klatkę" jest wyłączony** z tooltipem „Dostępne tylko dla MP4 wgranego do galerii" — wtedy zostaje opcja wgrania własnej grafiki.

## Zmiany w danych

- **Block-level** (`src/types/newsHubBlocks.ts`): rozszerzam `VideoBlockData` o `poster?: string` (URL). Renderer (`BlockRenderer.tsx` case `video`) przekazuje poster do `NewsHubVideoPlayer`.
- **Post-level**: post ma już `cover_url` (główna okładka karty na liście aktualności). Dla typu „Wideo" ta sama wartość pełni rolę postera odtwarzacza — `NewsHubVideoPlayer` w widoku posta dostaje `poster={post.cover_url}`. Nie dodaję nowej kolumny w bazie; tylko reuse istniejącej `cover_url`.
- `NewsHubVideoPlayer`: dodaję prop opcjonalny `poster?: string` → trafia do `<video poster={poster}>`. Dla YouTube/Vimeo iframe ignorowany (te platformy mają własne thumbnail).

## Backend / storage

- Brak nowych tabel ani kolumn.
- Brak nowych edge functions.
- Reuse istniejącej funkcji `uploadNewsHubFile` (zgodnie z memory **News Hub Upload**: >2MB → XHR na VPS, mniejsze → Supabase). Stop-klatka JPG ~100–400 KB, pójdzie standardową drogą.

## Co dostarczam (pliki)

1. `src/types/newsHubBlocks.ts` — dodanie `poster?: string` w `VideoBlockData`.
2. `src/components/news-hub/NewsHubVideoPlayer.tsx` — prop `poster`, atrybut `<video poster>`.
3. `src/components/news-hub/VideoFrameCapturePicker.tsx` — **nowy** modal (suwak + capture klatki + upload).
4. `src/components/news-hub/editor/PosterPickerField.tsx` — **nowy** mały komponent: miniatura + 2 przyciski („Wgraj okładkę" / „Wybierz klatkę"). Używany w obu miejscach.
5. `src/components/news-hub/editor/MediaControls.tsx` — dla `draft.type === 'video'` dodaję `<PosterPickerField videoUrl={draft.media_url} value={draft.cover_url} onChange={(url) => update({ cover_url: url })} />`.
6. `src/components/news-hub/editor/BlockListEditor.tsx` — w `case 'video'` dodaję `<PosterPickerField videoUrl={d.url} value={d.poster} onChange={(url) => onChangeData({ poster: url })} />`.
7. `src/components/news-hub/BlockRenderer.tsx` — przekazanie postera do `NewsHubVideoPlayer` w bloku wideo.
8. `src/components/news-hub/PostContent.tsx` — dla posta typu wideo: `<NewsHubVideoPlayer url={post.media_url} poster={post.cover_url} />`.

## UX detale

- Modal wyboru klatki: czarne tło, video max-h 70vh, pod spodem pasek czasu + 2 przyciski („Anuluj", „Użyj tej klatki" — disabled dopóki video się nie załaduje, spinner podczas uploadu).
- Po sukcesie toast „Okładka ustawiona".
- Mobile: suwak full-width, przyciski stack vertical.

## Czego NIE zmieniam

- Listy aktualności (kart) — to już używa `cover_url`, działa bez zmian.
- Logiki uploadu wideo, walidacji rozmiaru, kompresji.
- YouTube/Vimeo (mają własne thumbnaile).
