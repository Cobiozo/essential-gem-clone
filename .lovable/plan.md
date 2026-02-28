
## Naprawa: efekty tla nie dzialaja na desktop w webinarach

### Zidentyfikowane przyczyny

**Przyczyna 1 (glowna): Petla zwrotna - procesor przetwarza wlasne wyjscie**

W `handleBackgroundChange` do `applyBackground` przekazywany jest `localStreamRef.current`, ktory po pierwszym uzyciu efektu jest strumieniem z `captureStream()` (wyjscie procesora). Wewnatrz `applyBackground` istnieje zabezpieczenie:

```text
if (!rawStreamRef.current || rawStreamRef.current.getTracks().every(t => t.readyState === 'ended')) {
  rawStreamRef.current = inputStream;  // <- TUTAJ: inputStream to przetworzony strumien!
}
```

Na desktop, sciezka kamery moze zakonczyc sie (deviceId zmiana, sleep mode, odlaczenie USB kamery) i `rawStreamRef` wskazuje na martwy strumien. Wtedy `rawStreamRef` zostaje nadpisany przetworzonym strumieniem (CanvasCaptureMediaStreamTrack). Procesor probuje segmentowac wlasne wyjscie - efekt nie dziala lub daje zgarblony obraz.

Na mobilnych to rzadziej wystepuje, bo kamera jest wbudowana i nie traci polaczenia.

**Przyczyna 2: handleToggleCamera tworzy nowy MediaStream bez aktualizacji ref**

```text
setLocalStream(new MediaStream(stream.getTracks()));  // nowy obiekt
// ale localStreamRef.current NIE jest aktualizowany!
```

Kazde przelaczenie kamery tworzy nowy wrapper MediaStream. `VideoParticipantTile` otrzymuje nowy obiekt, odpala `useEffect`, resetuje `video.srcObject`. Na desktop Chrome, wielokrotne resetowanie `srcObject` na CanvasCaptureMediaStreamTrack moze powodowac utrate klatek lub czarny obraz.

**Przyczyna 3: Procesor dziala w tle podczas udostepniania ekranu**

Gdy uzytkownik udostepnia ekran, `localStreamRef.current.getVideoTracks().forEach(t => t.stop())` zatrzymuje track canvas capture, ale procesor nadal rysuje na canvas (petla `processFrame` dziala). Po zakonczeniu udostepniania, `restoreCamera` tworzy nowy procesor, ale stara petla moze interferowac.

### Rozwiazanie

**Zmiana 1: Zabezpieczenie przed petla zwrotna w `useVideoBackground.ts`**

W `applyBackground`, przed ustawieniem `rawStreamRef.current = inputStream`, sprawdzic czy inputStream nie jest wyjsciem procesora. Oznaczyc strumienie wyjsciowe flagaa:

```text
// Po processor.start():
const outputStream = await processor.start(sourceStream);
(outputStream as any).__bgProcessed = true;

// W fallback:
if (!rawStreamRef.current || rawStreamRef.current.getTracks().every(t => t.readyState === 'ended')) {
  if ((inputStream as any).__bgProcessed) {
    console.warn('[useVideoBackground] Cannot use processed stream as raw source, skipping effect');
    setMode('none');
    return inputStream;
  }
  rawStreamRef.current = inputStream;
}
```

**Zmiana 2: Nie tworzyc nowego MediaStream w `handleToggleCamera` (VideoRoom.tsx)**

Zamiast `setLocalStream(new MediaStream(stream.getTracks()))`, wymusic re-render inaczej:

```text
// Zamiast:
setLocalStream(new MediaStream(stream.getTracks()));

// Uzyc:
setLocalStream(prev => {
  // Force re-render by creating shallow wrapper only if needed
  if (prev === stream) return new MediaStream(stream.getTracks());
  return stream;
});
```

Albo lepiej - uzyc osobnego state do wymuszenia re-renderu:

```text
const [cameraToggleKey, setCameraToggleKey] = useState(0);
// ...
setCameraToggleKey(k => k + 1);
// I przekazac key do VideoGrid aby wymusic re-render bez zmiany stream reference
```

Najlepsza opcja: po prostu zaktualizowac tez `localStreamRef.current`:

```text
const wrapped = new MediaStream(stream.getTracks());
localStreamRef.current = wrapped;
setLocalStream(wrapped);
```

Ale to by odlaczalo procesor od ref. Wiec najlepiej: NIE tworzyc nowego MediaStream, tylko uzyc counter/flag:

```text
stream.getVideoTracks().forEach((t) => (t.enabled = newEnabled));
setIsCameraOff(newCameraOff);
// Wymusic re-render przez ustawienie tego samego strumienia (React nie wykryje zmiany)
// Wiec uzyc dodatkowego stanu:
setLocalStream(prev => prev); // nie zadziala - ta sama referencja
```

Praktyczne rozwiazanie: zachowac `new MediaStream(stream.getTracks())` ale ROWNIEZ zaktualizowac `localStreamRef.current`:

```text
const wrappedStream = new MediaStream(stream.getTracks());
localStreamRef.current = wrappedStream;
setLocalStream(wrappedStream);
```

I oznaczyc ten wrapper jako processed jesli oryginal byl processed:
```text
if ((stream as any).__bgProcessed) {
  (wrappedStream as any).__bgProcessed = true;
}
```

**Zmiana 3: Zatrzymac procesor przy udostepnianiu ekranu (VideoRoom.tsx)**

W `handleToggleScreenShare`, przed rozpoczeciem udostepniania:

```text
// Zatrzymaj procesor tla aby nie marnowac zasobow
stopBackground();
```

W `restoreCamera` procesor jest juz uruchamiany ponownie jesli `bgModeRef.current !== 'none'`.

**Zmiana 4: Dodac `updateRawStream` w `handleBackgroundChange` (VideoRoom.tsx)**

Przed wywolaniem `applyBackground`, jesli aktualny `localStreamRef.current` jest przetworzony, nie uzywac go jako raw:

```text
const handleBackgroundChange = useCallback(async (newMode: BackgroundMode, imageSrc?: string) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    try {
      // Ensure raw stream is up-to-date before applying new effect
      if (!(stream as any).__bgProcessed) {
        updateRawStream(stream);
      }
      const processedStream = await applyBackground(stream, newMode, imageSrc);
      ...
```

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/hooks/useVideoBackground.ts` | Flaga `__bgProcessed` na strumieniach wyjsciowych + guard przed petla zwrotna |
| `src/components/meeting/VideoRoom.tsx` | Aktualizacja `localStreamRef` w handleToggleCamera |
| `src/components/meeting/VideoRoom.tsx` | `stopBackground()` przy starcie screen share |
| `src/components/meeting/VideoRoom.tsx` | Guard w handleBackgroundChange - updateRawStream tylko dla surowych strumieni |

### Ryzyko

Niskie. Zmiany sa defensywne (guardy, flagi). Nie zmieniaja glownego flow, tylko zabezpieczaja edge-case'y ktore powoduja awarie na desktop. Kompatybilnosc wsteczna zachowana.
