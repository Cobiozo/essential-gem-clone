## Problem

W zainstalowanej aplikacji (PWA standalone na telefonie) wideo w Aktualnościach pokazuje błąd „Nie można odtworzyć tego pliku wideo." mimo że plik istnieje i działa w zwykłej karcie przeglądarki.

## Przyczyna (zdiagnozowana w `src/components/news-hub/PostContent.tsx`, komponent `VideoPlayer`)

Komponent wykonuje 2 niezależne checki, które fałszywie ustawiają `error=true` w PWA:

1. **Probe `fetch(url, { headers: { Range: 'bytes=0-0' } })`** — niestandardowy nagłówek wymusza CORS preflight (OPTIONS) na `purelife.info.pl`. Serwer często zwraca dla probe **status 200** zamiast 206 (Partial Content). Warunek `res.status !== 200 && res.status !== 206` jest poprawny, ale gdy preflight zwraca błąd lub serwer odpowiada nietypowo (np. 200 + `content-type: video/mp4` OK — wtedy OK; ale jeśli zwraca 200 + tekst lub redirect → error). W standalone WebView (iOS/Android dodane do ekranu) ciasteczka i nagłówki różnią się od zwykłej karty, częściej kończy się to `text/html` lub statusem ≠ 200/206.
2. **6-sekundowy timeout** sprawdzający `video.duration` — w PWA na słabszej sieci/cellularnej metadane MP4 mogą nie zdążyć się załadować w 6 s i error jest fałszywie ustawiany, nawet jeśli wideo by się dograło.

Dodatkowo: brak `crossOrigin` i brak rozróżnienia faktycznego błędu `<video>` od timeouta powoduje, że odtwarzacz nie ma szansy zadziałać.

## Fix

**Plik: `src/components/news-hub/PostContent.tsx` — komponent `VideoPlayer`**

1. **Usunąć probe `fetch(...)` z nagłówkiem `Range`** w całości. Niech `<video>` sam decyduje przez zdarzenia `onError` / `onLoadedMetadata` / `onCanPlay`. Eliminuje CORS preflight, fałszywe positives i niepotrzebny request.
2. **Usunąć 6-sekundowy timer** sprawdzający `video.duration`. Zamiast tego polegać na natywnym `onError` elementu `<video>` oraz na zdarzeniu `stalled`/`error` z `<source>`.
3. **Dodać `<source src={url} type="video/mp4">`** zamiast `src` na `<video>`, z `onError` na `<source>` — dokładniej raportuje błąd ładowania pliku.
4. **Reset stanu `error`** tylko przy zmianie `url` (już jest, zachować).
5. **`preload="metadata"`** zostawić; dodać `controlsList="nodownload"` (opcjonalnie, kosmetyka).
6. Nie ustawiać `crossOrigin` (nie odczytujemy klatek do canvas; ustawienie crossOrigin bez CORS na VPS zepsułoby playback).

## Audyt wycieków/pętli/obciążeń (krótki przegląd)

Przy okazji sprawdzić w `PostContent.tsx`:
- `VideoPlayer` po fixie nie tworzy żadnego nasłuchu poza JSX-owym `onError` → brak wycieku.
- Nie ma `URL.createObjectURL` w tej ścieżce → nic do `revokeObjectURL`.
- `useEffect` z deps `[url, yt, vm]`: po usunięciu fetch+timer effect staje się zbędny — całość przeniesiona do JSX (jeden `useState` na error, reset przez `key={url}` na `<video>`).
- Brak `setInterval` ani realtime subskrypcji w tym pliku.

Nie ruszamy żadnej logiki biznesowej, edytora, ani innych komponentów. Zmiana ograniczona do ~30 linii w jednym pliku.

## Akceptacja

- Po fixie: w PWA standalone otwarcie postu typu „video" pokazuje natywny player z plikiem z `purelife.info.pl`, controls działają, brak fałszywego komunikatu o błędzie.
- Gdy plik faktycznie nie istnieje (404) — `<video onError>` zadziała i pokaże fallback (zachowujemy ten sam UI błędu z linkiem do pliku).
