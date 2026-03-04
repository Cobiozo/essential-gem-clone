
Cel: naprawić regresję efektów tła na mobile/PWA (szczególnie iPhone), gdzie użytkownik dostaje błąd „Nie udało się zastosować efektu tła”.

Ustalenia (po analizie kodu + Twojej odpowiedzi):
- Problem występuje głównie na mobile/PWA.
- Objaw: sam efekt nie uruchamia się (nie tylko spadek FPS).
- Najbardziej ryzykowne miejsca:
  1) `VideoBackgroundProcessor` emituje `background-processor-stalled` także gdy aplikacja jest w tle (iOS/PWA często zeruje `videoWidth` w tle), co może wywoływać niepotrzebne reacquire i rozjechać pipeline.
  2) `handleBackgroundChange` w `VideoRoom.tsx` ma jednokrokowe apply (bez retry/fallback), więc pojedynczy błąd iOS kończy się od razu tostem błędu.
  3) Start procesora opiera się na modelu z CDN i delegacie GPU/CPU, ale bez „mobile compatibility mode” i bez kontrolowanej degradacji przy błędzie startu.
  4) Brak rozróżnienia błędów (model load, autoplay/video not ready, context loss), więc użytkownik zawsze dostaje ten sam ogólny komunikat.

Plan wdrożenia:

1) Utwardzenie procesora tła pod iOS/PWA (`src/components/meeting/VideoBackgroundProcessor.ts`)
- Dodać tryb kompatybilności mobile/PWA:
  - detekcja: iPhone/iPad + standalone PWA.
  - preferencja CPU (lub fallback CPU-first po nieudanym GPU).
  - niższe parametry startowe (mniejsza rozdzielczość przetwarzania i rzadsza segmentacja) tylko dla compatibility mode.
- Poprawić logikę stall:
  - NIE emitować `background-processor-stalled`, gdy `document.hidden === true`.
  - resetować licznik stall po powrocie do foreground.
- Dodać klasyfikowane wyjątki z kodami (np. `BG_MODEL_INIT_FAILED`, `BG_VIDEO_NOT_READY`, `BG_CONTEXT_LOST`) zamiast jednego ogólnego throw.
- Dodać „single retry on start” wewnątrz procesora (restart internals raz, zanim odda błąd na zewnątrz).

2) Retry + fallback w hooku (`src/hooks/useVideoBackground.ts`)
- W `applyBackground()` dodać strategię wieloetapową:
  - próba normalna,
  - przy błędzie na mobile/PWA: restart procesora + próba w trybie compatibility,
  - jeśli nadal fail: fallback do `blur-light` (najlżejszy) zanim zwróci błąd końcowy.
- Rozszerzyć zwracane info o ostatni błąd techniczny (kod), aby UI pokazywało sensowny komunikat.
- Zachować obecne `updateSourceStream`, ale dodać bezpiecznik: jeśli hot-swap nie powiedzie się, wymusić pełny restart procesora tylko raz.

3) Lepszy flow zmiany tła w pokoju (`src/components/meeting/VideoRoom.tsx`)
- Przerobić `handleBackgroundChange`:
  - użyć `reacquireLocalStream()` zamiast lokalnego, uproszczonego `getUserMedia` fallbacku.
  - dodać lock `isApplyingBackground` (zapobiega podwójnym kliknięciom i nakładaniu async apply).
  - przy błędzie pokazywać komunikat zależny od kodu błędu (np. „iPhone/PWA: spróbuj ponownie po wznowieniu kamery” zamiast generycznego).
- Zmienić reakcję na `background-processor-stalled`:
  - ignorować event podczas `document.hidden`,
  - w foreground uruchamiać recovery kontrolowane (z cooldown), bez pętli reacquire.
- Dodać lekką telemetrię debugową (console) tylko dla ścieżki mobile/PWA: etap, kod błędu, aktywny mode.

4) UX ochronny dla mobile (bez zmiany desktopowego zachowania)
- Przy wyborze tła na mobile/PWA:
  - jeśli pierwsza próba `image` nie przejdzie, automatycznie zaproponować `blur-light` (i komunikat „obraz tła może być zbyt ciężki na tym urządzeniu”).
- Nie wyłączać funkcji globalnie — tylko inteligentna degradacja per urządzenie.

Pliki do modyfikacji:
- `src/components/meeting/VideoBackgroundProcessor.ts`
- `src/hooks/useVideoBackground.ts`
- `src/components/meeting/VideoRoom.tsx`

Plan testów po wdrożeniu (end-to-end):
1) iPhone Safari (browser) + iPhone PWA:
- wejście do lobby -> dołączenie -> włączenie `blur-light`, `blur-heavy`, `image`.
- przejście app do tła i powrót -> ponowna zmiana efektu.
- oczekiwane: brak tostu „Nie udało się zastosować efektu tła” w normalnym flow.
2) Android Chrome + Android PWA:
- ten sam scenariusz, plus szybkie przełączanie efektów.
3) Desktop regression:
- upewnić się, że dotychczasowe działanie i jakość nie są pogorszone.
4) Stabilność:
- brak pętli reacquire, brak lawiny eventów `background-processor-stalled`, brak freeze lokalnego podglądu przy zmianie efektu.

Ryzyka i mitigacje:
- Ryzyko: zbyt agresywna degradacja jakości na mobile.
  - Mitigacja: compatibility mode aktywować tylko po realnym błędzie startu lub dla iOS PWA.
- Ryzyko: retry wydłuży czas przełączenia efektu.
  - Mitigacja: limit 1 retry i czytelny stan „stosowanie efektu...”.
