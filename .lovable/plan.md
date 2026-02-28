

## Naprawa: Brak video po ponownym wejściu w webinar na mobile

### Zidentyfikowane przyczyny

**Przyczyna 1: Audio unlock działa tylko raz**

W `VideoRoom.tsx` (linia 162-188), listenery `touchstart`/`click` mają `{ once: true }`. Oznacza to, że handler `unlockAudio` uruchamia się przy PIERWSZYM dotknięciu po zamontowaniu VideoRoom. Problem: zdalne strumienie WebRTC docierają PÓŹNIEJ (po negocjacji ICE), więc w momencie odpalenia unlock nie ma jeszcze żadnych zdalnych `<video>` do odblokowania. Po tym handler znika, a kolejne strumienie przechodzą przez `playVideoSafe`, które nie ma kontekstu gestu użytkownika -- `video.play()` jest blokowane przez przeglądarkę mobilną.

**Przyczyna 2: VideoTile nie ponawia play() po początkowej porażce**

W `VideoTile` (linia 91-96), `useEffect` wywołuje `playVideoSafe` raz przy zmianie `participant.stream`. Jeśli `play()` nie powiedzie się (autoplay blocked), video pozostaje wstrzymane na zawsze. Nie ma mechanizmu ponowienia próby po interakcji użytkownika ani po załadowaniu metadanych strumienia.

**Przyczyna 3: srcObject zmieniony ale play() nie wywołane ponownie**

Gdy zdalna ścieżka video kończy się i zostaje zastąpiona nową (reconnect), `participant.stream` obiekt może pozostać ten sam (ten sam MediaStream z nowym trackiem), więc useEffect w VideoTile się nie odpala (referencja `stream` nie zmieniła się), a video element nie wie o nowym tracku.

### Rozwiązanie

#### 1. Persistent audio/video unlock w VideoRoom
**Plik: `src/components/meeting/VideoRoom.tsx`**

Usunąć `{ once: true }` z listenerów `touchstart`/`click`. Dodać flagę `unlocked` jako ref, aby unikać wielokrotnego uruchamiania kosztownej logiki AudioContext. Handler powinien ZAWSZE próbować odblokować wstrzymane zdalne video (nie tylko za pierwszym razem):

```text
const audioUnlockedRef = useRef(false);

useEffect(() => {
  const unlockAudio = () => {
    // AudioContext resume - tylko raz
    if (!audioUnlockedRef.current) {
      audioUnlockedRef.current = true;
      try {
        const ctx = new AudioContext();
        ctx.resume().then(() => ctx.close()).catch(() => {});
      } catch {}
    }
    // Zawsze: próbuj odblokować wstrzymane zdalne video
    document.querySelectorAll('video').forEach((v) => {
      const video = v as HTMLVideoElement;
      if (video.paused && video.srcObject && !video.dataset.localVideo) {
        video.muted = false;
        video.play().catch(() => {});
      }
    });
    setAudioBlocked(false);
  };
  document.addEventListener('touchstart', unlockAudio);  // BEZ { once: true }
  document.addEventListener('click', unlockAudio);
  return () => {
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  };
}, []);
```

#### 2. VideoTile: retry play() z onloadedmetadata + obserwacja paused
**Plik: `src/components/meeting/VideoGrid.tsx`**

W komponencie `VideoTile`, dodać:
- Listener `loadedmetadata` na elemencie video, który ponownie wywołuje `playVideoSafe`
- Listener `onloadeddata` jako dodatkowy trigger
- Retry `play()` gdy komponent re-renderuje się ze stream który ma paused video

```text
useEffect(() => {
  const video = videoRef.current;
  if (!video || !participant.stream) return;
  video.srcObject = participant.stream;
  playVideoSafe(video, !!participant.isLocal, onAudioBlocked);
  
  // Retry play gdy metadane się załadują (stream może nie być gotowy od razu)
  const handleLoaded = () => {
    if (video.paused && video.srcObject) {
      playVideoSafe(video, !!participant.isLocal, onAudioBlocked);
    }
  };
  video.addEventListener('loadedmetadata', handleLoaded);
  video.addEventListener('loadeddata', handleLoaded);
  
  return () => {
    video.removeEventListener('loadedmetadata', handleLoaded);
    video.removeEventListener('loadeddata', handleLoaded);
  };
}, [participant.stream, onAudioBlocked]);
```

#### 3. VideoTile: obserwacja nowych ścieżek w istniejącym strumieniu
**Plik: `src/components/meeting/VideoGrid.tsx`**

Dodać nasłuchiwanie na zdarzenia `addtrack`/`removetrack` na MediaStream, aby wychwycić sytuację gdy ścieżki zostały zastąpione bez zmiany referencji strumienia:

```text
useEffect(() => {
  const stream = participant.stream;
  const video = videoRef.current;
  if (!stream || !video) return;
  
  const handleTrackChange = () => {
    if (video.srcObject !== stream) video.srcObject = stream;
    playVideoSafe(video, !!participant.isLocal, onAudioBlocked);
  };
  
  stream.addEventListener('addtrack', handleTrackChange);
  stream.addEventListener('removetrack', handleTrackChange);
  
  return () => {
    stream.removeEventListener('addtrack', handleTrackChange);
    stream.removeEventListener('removetrack', handleTrackChange);
  };
}, [participant.stream, onAudioBlocked]);
```

#### 4. ThumbnailTile i MiniVideo: te same poprawki play retry
**Plik: `src/components/meeting/VideoGrid.tsx`**

Dodać `loadedmetadata` handler w ThumbnailTile (linia 165-170) i MiniVideo (linia 411-416) analogicznie do VideoTile.

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoRoom.tsx` | Persistent audio unlock (usunięcie `{ once: true }`, zawsze retry paused videos) |
| `src/components/meeting/VideoGrid.tsx` | VideoTile: loadedmetadata + addtrack retry; ThumbnailTile/MiniVideo: analogiczne poprawki |

### Dlaczego to naprawi problem

1. **Persistent unlock**: Każde dotknięcie ekranu przez użytkownika odblokuje WSZYSTKIE wstrzymane zdalne video, nawet te które pojawiły się po pierwszym dotknięciu
2. **loadedmetadata retry**: Gdy strumień WebRTC dotrze i metadane się załadują, video automatycznie zacznie grać bez czekania na gest użytkownika (bo muted autoplay jest dozwolone)
3. **addtrack observer**: Gdy ścieżka video zostanie wymieniona w istniejącym strumieniu (reconnect), video element automatycznie zacznie odtwarzać nową ścieżkę
4. **Fallback chain**: playVideoSafe nadal działa jako siatka bezpieczeństwa - unmuted play() -> muted play() -> audio blocked banner -> user tap -> persistent unlock

