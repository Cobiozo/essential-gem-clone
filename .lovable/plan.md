

## Plan: Naprawa zamrożonego obrazu prowadzącego (host freeze)

### Zidentyfikowane przyczyny

Po dogłębnej analizie `VideoRoom.tsx`, `VideoGrid.tsx`, `VideoBackgroundProcessor.ts` i `useVideoBackground.ts` zidentyfikowałem 4 kluczowe przyczyny zamrożenia obrazu prowadzącego:

---

### Problem 1: `applyConstraints()` wywołane na canvas-captured track
**Plik:** `VideoRoom.tsx`, linie 174-197

`useEffect` reagujący na `participants.length` wywołuje `videoTrack.applyConstraints()` na `localStreamRef.current.getVideoTracks()[0]`. Gdy efekt tła jest aktywny, `localStreamRef.current` to strumień z `canvas.captureStream()` -- jego `CanvasCaptureMediaStreamTrack` **nie obsługuje `applyConstraints()`**. Wywołanie może spowodować silent failure lub uszkodzenie tracka, co zamraża obraz.

**Naprawa:** Sprawdzać, czy track pochodzi z canvasa (brak `getCapabilities().width`), i stosować constraints tylko na surowym tracku kamery (`rawStreamRef` z `useVideoBackground`). Dodac eksport `getRawStream()` z hooka.

### Problem 2: Stale `videoElement` w VideoBackgroundProcessor po reacquire
**Plik:** `VideoBackgroundProcessor.ts` / `useVideoBackground.ts`

Gdy `reacquireLocalStream()` uzyskuje nowy strumień kamery, wywołuje `updateRawStream(stream)`, co aktualizuje `rawStreamRef.current`, ale **nie informuje aktywnego procesora** o nowym źródle. `VideoBackgroundProcessor.videoElement.srcObject` nadal wskazuje na stary, martwy strumień. Procesor rysuje z martwego elementu video → canvas się nie aktualizuje → `captureStream()` produkuje zamrożone klatki.

**Naprawa:** Dodać metodę `updateSourceStream(newStream)` do `VideoBackgroundProcessor`, która podmieni `videoElement.srcObject` bez pełnego restart (stop/start). Wywołać ją z `updateRawStream` gdy procesor jest aktywny.

### Problem 3: Brak detekcji zamrożonego lokalnego strumienia
**Plik:** `VideoRoom.tsx`

Nie ma mechanizmu wykrywania, czy lokalny strumień wideo przestał produkować klatki. Jeśli `captureStream()` lub kamera zamrze, prowadzący nie wie o problemie i nie ma automatycznej naprawy.

**Naprawa:** Dodać monitoring `getStats()` lub `requestVideoFrameCallback()` na lokalnym video tracku. Jeśli brak nowych klatek przez 5s, automatycznie wywołać `reacquireLocalStream()`.

### Problem 4: Brak heartbeatu na `VideoBackgroundProcessor` output
**Plik:** `VideoBackgroundProcessor.ts`

Gdy pętla `processFrame` przestanie rysować (np. `videoElement.videoWidth === 0` w pętli -- rAF działa, ale nic nie rysuje), `captureStream()` wysyła ostatnią klatkę w kółko. Nie ma detekcji tego stanu.

**Naprawa:** Dodać licznik "empty frames" w `processFrame`. Jeśli `videoElement.videoWidth === 0` utrzymuje się przez 30 klatek, emitować event `background-processor-stalled`, na który `VideoRoom` zareaguje wywołaniem `reacquireLocalStream()`.

---

### Zmiany w plikach

**1. `src/components/meeting/VideoBackgroundProcessor.ts`**
- Dodać publiczną metodę `updateSourceStream(newStream: MediaStream)` -- podmienia `videoElement.srcObject` na żywo, bez restartu procesora
- Dodać licznik pustych klatek (`stallFrameCount`) i event `background-processor-stalled` po 30 pustych klatkach
- Dodać publiczną metodę `isStalled(): boolean`

**2. `src/hooks/useVideoBackground.ts`**
- Zmienić `updateRawStream()` aby wywołać `processor.updateSourceStream()` jeśli procesor jest aktywny
- Wyeksportować `getRawStream()` zwracającą `rawStreamRef.current` (surowy strumień kamery)

**3. `src/components/meeting/VideoRoom.tsx`**
- W `useEffect` adaptive quality (linia 174): stosować `applyConstraints()` na surowym tracku kamery (z `getRawStream()`), nie na przetworzonym
- Dodać monitoring zamrożenia lokalnego strumienia: `requestVideoFrameCallback` lub `setInterval` sprawdzający czy video element odtwarza klatki
- Nasłuchiwać na event `background-processor-stalled` i reagować `reacquireLocalStream()`
- W `reacquireLocalStream()`: po uzyskaniu nowego strumienia, wywołać `updateRawStream()` (co teraz automatycznie zaktualizuje procesor)

### Zakres
3 pliki, ~60 linii nowego kodu. Bez zmian w edge functions ani bazie danych.

