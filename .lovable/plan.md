

## Naprawa: zamrozone wideo na mobile po powrocie z innej karty

### Przyczyna

Na urzadzeniach mobilnych (iOS/Android) przelaczenie na inna karte powoduje, ze przegladarka czesto **zamraza** sciezki kamery, ale NIE zmienia ich `readyState` na `'ended'` -- pozostaja jako `'live'`. 

Obecna logika w `handleVisibilityChange` (linia 638-639) sprawdza:
```text
const tracksAlive = stream?.getTracks().some(t => t.readyState === 'live');
if (!stream || !tracksAlive) { reacquireLocalStream(); }
```

Gdy sciezki sa zamrozone ale technicznie "live", warunek jest spelniony i `reacquireLocalStream()` NIE jest wywolywane. Wideo pozostaje zamrozone.

Drugi problem: nawet gdy re-acquire sie uda, element `<video>` moze nie wznowic odtwarzania automatycznie na mobile (Safari wymaga gestu uzytkownika lub jawnego `play()`).

### Rozwiazanie

Trzy zmiany w `VideoRoom.tsx` i jedna w `VideoGrid.tsx`:

**Zmiana 1: Wymusze re-acquire na mobile niezaleznie od readyState (VideoRoom.tsx, handleVisibilityChange)**

Na urzadzeniach mobilnych zawsze wywolac `reacquireLocalStream()` po powrocie na karte, bo nie mozna polegac na `readyState`. Na desktopie zachowac obecna logike (sprawdzenie readyState).

```text
// PRZED (linia 637-644):
let stream = localStreamRef.current;
const tracksAlive = stream?.getTracks().some(t => t.readyState === 'live');
if (!stream || !tracksAlive) {
  const freshStream = await reacquireLocalStream();
  ...
}

// PO:
let stream = localStreamRef.current;
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const tracksAlive = stream?.getTracks().some(t => t.readyState === 'live');

if (!stream || !tracksAlive || isMobile) {
  console.log('[VideoRoom] Re-acquiring stream (mobile=' + isMobile + ', alive=' + tracksAlive + ')');
  if (isMobile && stream) {
    // Na mobile: zatrzymaj stare sciezki przed ponownym pobraniem
    stream.getTracks().forEach(t => t.stop());
  }
  const freshStream = await reacquireLocalStream();
  if (!freshStream) return;
  stream = freshStream;
}
```

**Zmiana 2: Dodac debounce 200ms dla mobile visibilitychange (VideoRoom.tsx)**

Mobile Safari czesto emituje wielokrotne zdarzenia `visibilitychange` w krotkim czasie. Dodac krotki debounce aby uniknac wielokrotnego re-acquire.

```text
const handleVisibilityChange = async () => {
  if (document.hidden || cleanupDoneRef.current) return;
  // Debounce na mobile - poczekaj 200ms zeby upewnic sie ze karta jest naprawde widoczna
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (isMobile) {
    await new Promise(r => setTimeout(r, 200));
    if (document.hidden) return; // Karta znow ukryta
  }
  // ... reszta logiki
};
```

**Zmiana 3: Wymusic play() na elemencie video po zmianie strumienia (VideoGrid.tsx, VideoTile)**

Dodac listener na `visibilitychange` w `VideoTile` ktory wymusza `play()` po powrocie na karte:

```text
// Nowy useEffect w VideoTile (po istniejacych):
useEffect(() => {
  const handleVisibility = () => {
    if (!document.hidden && videoRef.current && participant.stream) {
      // Force re-play on tab return (mobile Safari fix)
      const video = videoRef.current;
      if (video.paused || video.ended) {
        playVideoSafe(video, !!participant.isLocal, onAudioBlocked);
      }
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [participant.stream, participant.isLocal, onAudioBlocked]);
```

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `VideoRoom.tsx` | Wymusze re-acquire na mobile niezaleznie od readyState + debounce 200ms |
| `VideoGrid.tsx` | Nowy useEffect w VideoTile: force play() po powrocie na karte |

