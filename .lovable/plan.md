

## Naprawa: efekty tla/rozmycia nie dzialaja w widoku galerii z uczestnikami

### Zidentyfikowane przyczyny

**Przyczyna 1: Brak `updateRawStream` w inicjalizacji**

W init flow (linia 737-738) strumien kamery jest ustawiany:
```text
localStreamRef.current = stream;
setLocalStream(stream);
```
Ale `updateRawStream(stream)` NIE jest wywolywane. Przez to `rawStreamRef.current` w `useVideoBackground` jest `null` az do pierwszego wywolania `applyBackground`. Jesli uzytkownik przelacza kamere lub cos innego zmieni strumien przed zastosowaniem efektu, `rawStreamRef` moze wskazywac na zly strumien (przetworzony zamiast surowego).

**Przyczyna 2: Procesor wpada w pass-through przez przeciazenie**

Gdy dolaczaja uczestnicy, WebRTC dekodowanie/enkodowanie zuzywa GPU/CPU. Segmentacja MediaPipe zaczyna przekraczac 150ms na klatke. Po 30 kolejnych przekroczeniach procesor wchodzi w tryb pass-through (brak efektow). Proba wyjscia co 2 sekundy konczy sie natychmiastowym powrotem do pass-through jesli system jest ciagle przeciazony.

**Przyczyna 3: `restoreCamera` nie przywraca efektu tla**

Po zakonczeniu udostepniania ekranu, `restoreCamera` (linia 1218-1260) ustawia surowy strumien bez ponownego zastosowania efektu tla. Efekt znika trwale.

### Rozwiazanie

**Zmiana 1: Dodac `updateRawStream` w init (VideoRoom.tsx)**

Po linii 738 dodac:
```text
updateRawStream(stream);
```
To zapewnia, ze `rawStreamRef` jest zawsze zsynchronizowany z surowym strumieniem kamery od samego poczatku.

**Zmiana 2: Dynamiczne dostosowanie rozdzielczosci przetwarzania (VideoBackgroundProcessor.ts)**

Dodac metode `setParticipantCount(count)` ktora obniza rozdzielczosc przetwarzania gdy sa uczestnicy:
- 0-1 uczestnikow: maxProcessWidth = 640 (desktop default)
- 2+ uczestnikow: maxProcessWidth = 480
- 4+ uczestnikow: maxProcessWidth = 320

Oraz zwiekszyc progi przeciazenia i spowolnic segmentacje:
- overloadThresholdMs: 150 -> 250ms
- segmentationIntervalMs: 66 -> 100ms (przy 2+ uczestnikach)
- overloadCounter limit: 30 -> 60 (mniej agresywne wchodzenie w pass-through)

**Zmiana 3: Przekazywanie liczby uczestnikow do procesora (VideoRoom.tsx + useVideoBackground.ts)**

W `handleBackgroundChange` i przy zmianach `participants.length`, wywolac metode procesora aktualizujaca profil wydajnosci.

Dodac `useEffect` w VideoRoom:
```text
useEffect(() => {
  // Inform processor about participant count for adaptive quality
  processorRef... setParticipantCount(participants.length);
}, [participants.length]);
```

Wymaga dodania metody `setParticipantCount` do useVideoBackground hook i VideoBackgroundProcessor.

**Zmiana 4: Re-apply background w `restoreCamera` (VideoRoom.tsx)**

Na koncu `restoreCamera`, po ustawieniu nowego strumienia, sprawdzic czy efekt tla byl aktywny i zastosowac go ponownie:
```text
// Po linii 1243 (replaceTrack):
updateRawStream(stream);
if (bgMode !== 'none') {
  try {
    const processedStream = await applyBackground(stream, bgMode, bgSelectedImage);
    if (processedStream !== stream) {
      localStreamRef.current = processedStream;
      setLocalStream(processedStream);
      const processedVideoTrack = processedStream.getVideoTracks()[0];
      if (processedVideoTrack) {
        connectionsRef.current.forEach((conn) => {
          const sender = (conn as any).peerConnection?.getSenders()?.find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(processedVideoTrack);
        });
      }
    }
  } catch (e) { console.warn('[VideoRoom] Failed to re-apply bg after restoreCamera:', e); }
}
```

**Zmiana 5: Mniej agresywne wchodzenie w pass-through (VideoBackgroundProcessor.ts)**

Zmiany w `processFrame`:
- Zwiekszyc `overloadCounter` limit z 30 na 60
- W trybie pass-through, proba wyjscia co 3s zamiast 2s
- Dodac log przy wejsciu/wyjsciu z pass-through aby ulatwic debugowanie

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `VideoRoom.tsx` | Dodac `updateRawStream(stream)` w init |
| `VideoRoom.tsx` | Re-apply bg w `restoreCamera` |
| `VideoRoom.tsx` | useEffect synchronizujacy participant count z procesorem |
| `useVideoBackground.ts` | Nowa metoda `setParticipantCount` przekazujaca do procesora |
| `VideoBackgroundProcessor.ts` | Nowa metoda `setParticipantCount` z adaptacyjna rozdzielczoscia |
| `VideoBackgroundProcessor.ts` | Mniej agresywne progi pass-through (60 klatek, 250ms threshold) |

