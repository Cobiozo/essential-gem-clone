

## Diagnoza: Spadek jakości/płynności video + sprzężenie dźwięku przy efektach tła

### Problem 1: Sprzężenie dźwięku (audio feedback)

**Przyczyna**: W `VideoBackgroundProcessor._startInternal()` (linia 396-398) ścieżki audio z wejściowego strumienia są dodawane do `outputStream` (strumień z canvas). Ta sama ścieżka audio istnieje więc na DWÓCH obiektach MediaStream (raw + processed). Dodatkowo, gdy kamera jest ponownie pozyskiwana (`updateSourceStream`), aktualizowany jest TYLKO video track na ukrytym `<video>` — ścieżki audio na `outputStream` pozostają STARE/martwe. To powoduje:
- Rozjechanie się referencji audio między `localStreamRef` a tym, co peers faktycznie odtwarzają
- Przeglądarka traci kontekst AEC (Acoustic Echo Cancellation) bo audio track jest na dwóch strumieniach
- Wyłączenie i włączenie mikrofonu pomaga, bo `handleToggleMute` wymusza ponowne pozyskanie strumienia (linia 1776), co resetuje ścieżkę audio

**Naprawa**: 
- **Nie dodawać audio do outputStream w procesorze** — procesor powinien zwracać strumień TYLKO z video (canvas)
- W `useVideoBackground.attemptApply()`: po otrzymaniu video-only outputStream, tworzyć nowy MediaStream łączący video z outputu + audio z rawStreamRef
- W `updateSourceStream`: oprócz video, synchronizować audio tracks na outputStream (usuwać stare, dodawać nowe)

### Problem 2: Spadek jakości i płynności video

**Przyczyny** (w `VideoBackgroundProcessor.ts`):
1. **Zbyt agresywne parametry image mode** (linia 43-48): `segmentationIntervalMs: 16` (= 60fps segmentacji!) na desktop i `60` na mobile — to ekstremalnie obciąża CPU, bo co 16ms uruchamia się model ML + getImageData + per-pixel blending
2. **getImageData/putImageData co klatkę** (linia 506-520): odczyt i zapis pikseli co rAF to najwolniejsza operacja na canvas 2D — przy rozdzielczości 960x540 to ~2M pikseli * 4 bajty per frame
3. **captureStream(outputFps)** capped na 24fps desktop / 15fps mobile — niższy niż natywna kamera (30fps), co daje widoczny spadek płynności
4. **refineMask z wieloma przejściami** (contrast, erode/dilate, spatial blur, smoothstep, temporal blend) — 6 pełnych iteracji po masce per segmentację

**Naprawa**:
- Zwiększyć `segmentationIntervalMs` w image mode overrides: desktop 50ms (20fps segmentacji), mobile 100ms — wystarczająca jakość bez zalewania CPU
- Zwiększyć `outputFps` w profilach: desktop 30fps, mobile 24fps — zbliżenie do natywnej kamery
- Dodać skip-frame w `processFrame`: jeśli czas od ostatniej segmentacji < interval I jest cached mask, rysować frame z cached mask bez ponownej segmentacji (już częściowo tak jest, ale getImageData wciąż się odpala co rAF)
- Optymalizacja: w trybie blur, gdy maska się nie zmieniła (cached), pominąć getImageData i użyć globalCompositeOperation do nałożenia blurred canvas z maską — eliminuje per-pixel JS loop

### Plan zmian

**Plik 1: `VideoBackgroundProcessor.ts`**

- `_startInternal()`: Usunąć linię 396-398 (dodawanie audio tracks do outputStream). Procesor zwraca TYLKO video stream.
- `updateSourceStream()`: Dodać synchronizację audio — usunąć stare audio tracks z outputStream, dodać nowe z newStream
- `IMAGE_MODE_OVERRIDES`: Zmienić `segmentationIntervalMs` z 16 na 50 (desktop) i z 60 na 100 (mobile)
- `DESKTOP_PROFILE.outputFps`: 24 → 30
- `MOBILE_PROFILE.outputFps`: 15 → 24
- `processFrame()`: Dodać szybką ścieżkę — jeśli nie ma nowej segmentacji I mask jest cached, użyć drawImage + mask overlay bez getImageData (gdy to możliwe)

**Plik 2: `useVideoBackground.ts`**

- `attemptApply()`: Po `processor.start()` (które teraz zwraca video-only stream), dołączyć audio tracks z `sourceStream` do outputStream. Tworzyć combined stream: video z procesora + audio z raw.

**Plik 3: `VideoRoom.tsx`**

- Brak zmian strukturalnych — poprawiony procesor i hook powinny wyeliminować oba problemy.

### Szacowany wpływ
- Audio feedback: eliminacja przez rozdzielenie ścieżek audio/video w procesorze
- FPS: wzrost z ~24fps do ~30fps na desktop, z ~15 do ~24 na mobile
- Obciążenie CPU: spadek ~40-60% dzięki rzadszej segmentacji w image mode i skip-frame optimization
- Jakość segmentacji: bez zmian (te same modele i refinement, tylko rzadziej)

