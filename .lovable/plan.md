

# Fix: Video nie aktywne mimo stanu "kamera ON" po odświeżeniu

## Diagnoza

Po odświeżeniu strony z zapisanym stanem `videoEnabled=true, audioEnabled=false`:

1. `acquireMediaByPreference(true, false)` próbuje pobrać A/V, potem video-only, potem audio-only
2. Jeśli kamera jest chwilowo niedostępna po refresh (typowe zachowanie przeglądarek), próby 1 i 2 **failują** → fallback do **audio-only**
3. Stream **nie ma video tracków**, ale `isCameraOff` pozostaje `false` (stan z sessionStorage)
4. Efekt: przycisk kamery pokazuje "ON", ale avatar wyświetlany (brak video tracków → `showVideo = false`)
5. Stan UI jest niespójny — użytkownik widzi "kamera ON" ale bez obrazu

## Plan zmian

### 1. Synchronizacja stanu po fallback (`VideoRoom.tsx` — `init()`)

Po linii 1095 dodać sprawdzenie: jeśli `initialVideo=true` ale stream nie ma live video tracków → `setIsCameraOff(true)`. Analogicznie dla audio. To zapewni spójność UI z rzeczywistym stanem mediów.

```typescript
// After track enable lines:
if (initialVideo && stream.getVideoTracks().filter(t => t.readyState === 'live').length === 0) {
  setIsCameraOff(true);
}
if (initialAudio && stream.getAudioTracks().filter(t => t.readyState === 'live').length === 0) {
  setIsMuted(true);
}
```

### 2. Opóźniony retry video (`VideoRoom.tsx` — `init()`)

Jeśli kamera była włączona ale stream jest audio-only, zaplanować retry po 2s — kamera może być gotowa po chwili. Jeśli retry się uda, przywrócić video track i `setIsCameraOff(false)`.

```typescript
if (initialVideo && stream.getVideoTracks().length === 0) {
  setTimeout(async () => {
    if (cleanupDoneRef.current) return;
    try {
      const retryStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      const videoTrack = retryStream.getVideoTracks()[0];
      if (videoTrack && localStreamRef.current) {
        localStreamRef.current.addTrack(videoTrack);
        setIsCameraOff(false);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        // Replace track on existing peer connections
        replaceTrackOnConnections(videoTrack);
      }
    } catch {}
  }, 2000);
}
```

### 3. Ten sam fix w `reacquireLocalStream()` 

Analogiczna synchronizacja stanu po re-akwizycji: jeśli `wantVideo=true` ale brak video tracków → `isCameraOffRef` update.

| Plik | Zmiana |
|---|---|
| `VideoRoom.tsx` linie ~1095 | Sync `isCameraOff`/`isMuted` z faktycznym składem tracków |
| `VideoRoom.tsx` linie ~1095 | Delayed retry video po fallback do audio-only |
| `VideoRoom.tsx` `reacquireLocalStream` | Analogiczna synchronizacja stanu |

