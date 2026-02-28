
## Naprawa: echo w trybach speaker/multi-speaker

### Problem

W trybach speaker/multi-speaker ten sam MediaStream (z trackami audio + video) jest przypisany jednoczesnie do:
1. Elementu `<video>` (muted via `forceAudioMuted`) 
2. Elementu `<audio>` (unmuted, z `AudioOnlyStreams`)

Przegladarki (szczegolnie Chrome) maja problemy z AEC (echo cancellation) gdy ten sam stream jest na dwoch elementach DOM jednoczesnie. Nawet muted `<video>` przetwarza track audio wewnetrznie, co "myli" algorytm AEC i powoduje echo.

W galerii kazdy stream jest na JEDNYM elemencie `<video>` -- AEC dziala poprawnie -- brak echa.

### Rozwiazanie: rozdzielenie tracków

Zamiast przypisywac pelny stream do obu elementow, rozdzielic tracki:
- `<video>` dostaje nowy MediaStream TYLKO z video tracks
- `<audio>` dostaje pelny stream (lub tylko audio tracks)

### Zmiany w `src/components/meeting/VideoGrid.tsx`

**1. VideoTile -- gdy `forceAudioMuted`, przypisac stream bez audio tracków**

W useEffect ktory ustawia `video.srcObject` (linia ~122-140), gdy `forceAudioMuted` jest true, stworzyc nowy MediaStream tylko z video trackami:

```text
useEffect(() => {
  const video = videoRef.current;
  if (!video || !participant.stream) return;
  
  // When forceAudioMuted, create video-only stream to avoid AEC confusion
  if (forceAudioMuted) {
    const videoTracks = participant.stream.getVideoTracks();
    if (videoTracks.length > 0) {
      const videoOnlyStream = new MediaStream(videoTracks);
      video.srcObject = videoOnlyStream;
    } else {
      video.srcObject = participant.stream;
    }
  } else {
    video.srcObject = participant.stream;
  }
  
  playVideoSafe(video, !!participant.isLocal, onAudioBlocked);
  // ... reszta handlerow loadedmetadata/loadeddata bez zmian
}, [participant.stream, forceAudioMuted, onAudioBlocked]);
```

**2. Analogiczna zmiana w obsludze `addtrack`/`removetrack` (linia ~142-160)**

Przy reconnect (handleTrackChange) rowniez tworzyc video-only stream gdy forceAudioMuted.

### Diagram

```text
PRZED (problem z AEC):
  <video muted> srcObject = stream(audio+video)  -- audio track przetwarzany
  <audio>        srcObject = stream(audio+video)  -- audio gra
  = dwa elementy z tym samym audio trackiem -> AEC confused -> echo

PO (naprawione):
  <video>  srcObject = new MediaStream(videoTracks)  -- brak audio tracku
  <audio>  srcObject = stream(audio+video)           -- audio gra
  = kazdy element ma osobne tracki -> AEC dziala poprawnie -> brak echa
```

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | VideoTile: gdy forceAudioMuted, tworzyc video-only MediaStream dla elementu video |

### Ryzyko

Niskie. Tworzenie nowego MediaStream z istniejacymi trackami jest lekkie (tracki sa wspoldzielone, nie kopiowane). Galeria nie jest modyfikowana. Zmiana dotyczy tylko routingu tracków w speaker/multi-speaker.
