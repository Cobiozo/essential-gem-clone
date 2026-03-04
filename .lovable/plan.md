

## Problem: Lobby niszczy strumień tła tuż po przekazaniu go do VideoRoom

### Przyczyna

W `MeetingLobby.tsx` linia 113-118, cleanup useEffect:
```
return () => {
    if (!streamPassedRef.current && cleanupStreamRef.current) {
        cleanupStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    stopBackground();  // <-- PROBLEM
};
```

Gdy użytkownik klika "Dołącz", lobby ustawia `streamPassedRef.current = true` (surowe tracki nie są zatrzymywane — OK), ale **zawsze** wywołuje `stopBackground()`. To wywołuje `processor.stop()` w instancji `useVideoBackground` lobby.

Procesor tła produkuje strumień z `canvas.captureStream()`. Ten strumień jest właśnie przekazywany do VideoRoom jako `initialStream`. Gdy `processor.stop()` zatrzymuje pętlę renderowania, canvas przestaje produkować klatki — `initialStream` staje się martwy.

VideoRoom otrzymuje martwy strumień, próbuje go użyć (tracki mają `readyState === 'live'` ale canvas nie produkuje klatek), co powoduje:
- Brak wideo
- Próba `reacquireLocalStream` lub błąd PeerJS przy wysyłaniu martwego strumienia

Dodatkowo, `previewBackground()` w `useVideoBackground.ts` (linia 244-248) nie łączy audio z video po naszych zmianach — zwraca video-only stream z procesora bez dodania audio tracks. Jeśli użytkownik używał preview, `processedStream` jest bez audio.

### Plan naprawy

**Plik 1: `src/components/meeting/MeetingLobby.tsx`**

1. **Cleanup useEffect (linia 113-118)**: Warunkowe `stopBackground()` — NIE wywoływać gdy `streamPassedRef.current === true`. Procesor lobby powinien żyć dopóki VideoRoom nie przejmie strumienia i nie stworzy własnego procesora.

```typescript
return () => {
    if (!streamPassedRef.current) {
        cleanupStreamRef.current?.getTracks().forEach((t) => t.stop());
        stopBackground();
    }
    // When stream was passed to VideoRoom, don't kill the processor —
    // VideoRoom will create its own and the old one will be GC'd
};
```

**Plik 2: `src/hooks/useVideoBackground.ts`**

2. **`previewBackground()` (linia 244-248)**: Po `processor.start()`, łączyć video z audio tak samo jak w `attemptApply()`:

```typescript
const videoOnlyStream = await processor.start(sourceStream);
const combinedStream = new MediaStream();
videoOnlyStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
sourceStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
(combinedStream as any).__bgProcessed = true;
return combinedStream;
```

3. **`previewBackground()` linia 241**: Gdy procesor już działa i zwracamy istniejący outputStream, też dodać audio tracks:

```typescript
const videoStream = (processor as any).outputStream || sourceStream;
if (videoStream !== sourceStream) {
    const combined = new MediaStream();
    videoStream.getVideoTracks().forEach(t => combined.addTrack(t));
    sourceStream.getAudioTracks().forEach(t => combined.addTrack(t));
    (combined as any).__bgProcessed = true;
    return combined;
}
return sourceStream;
```

### Zakres: 2 pliki, ~15 linii zmian

