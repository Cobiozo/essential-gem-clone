

## Naprawa echa wlasnego mikrofonu na mobile + przywracanie mediow po rozlaczeniu

### Problem 1: Slychac wlasny dzwiek z mikrofonu na mobile

**Przyczyna**: Wszystkie wywolania `getUserMedia` w projekcie uzywaja `{ audio: true }` bez jawnych constraintow. Choc wiekszenie przegladarek desktopowych wlacza `echoCancellation` domyslnie, **mobilne przegladarki (szczegolnie Safari iOS)** czesto tego nie robia automatycznie. Efekt: dzwiek z glosnika wraca do mikrofonu i jest wysylany do zdalnych uczestnikow, a takze slyszany lokalnie przez remote feedback loop.

Dotyczy to 6 miejsc w kodzie:
- `VideoRoom.tsx` init (~linia 671): `getUserMedia({ audio: true, video: true })`
- `VideoRoom.tsx` restoreCamera (~linia 1126)
- `VideoRoom.tsx` reacquireLocalStream (~linia 1168)
- `VideoRoom.tsx` restoreCamera fallback (~linia 1148)
- `MeetingLobby.tsx` preview (~linia 48)

**Naprawa**: Zamiana `audio: true` na obiekt z constraintami:
```text
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}
```

### Problem 2: Po rozlaczeniu/powrocie video i dzwiek nie wraca

**Przyczyna**: Gdy uzytkownik wraca z tla na mobile (`visibilitychange`), handler w linii 611 pobiera `localStreamRef.current` i uzywa go do reconnectu z peerami. Problem:
1. Sciezki strumienia sa w stanie `ended` (system zabral kamerke/mikrofon)
2. Handler **nie sprawdza** czy sciezki sa zywe
3. Wysyla "martwy" strumien do `callPeer` -- peer go otrzymuje ale nie ma audio/video
4. Dopiero reczne przelaczenie kamery wyzwala `reacquireLocalStream` ktory pobiera nowy strumien

**Naprawa**: Na poczatku `handleVisibilityChange` dodac sprawdzenie czy sciezki strumienia sa zywe. Jesli nie -- wywolac `reacquireLocalStream()` i uzyc nowego strumienia do reconnectu:

```text
const handleVisibilityChange = async () => {
  if (document.hidden || cleanupDoneRef.current) return;
  
  let stream = localStreamRef.current;
  // Check if tracks are dead (mobile bg kill)
  const tracksAlive = stream && stream.getTracks().some(t => t.readyState === 'live');
  if (!tracksAlive) {
    stream = await reacquireLocalStream();
    if (!stream) return;
  }
  
  // ... reszta logiki reconnectu z uzyciem swiezego stream
};
```

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoRoom.tsx` | 1) Dodac audio constraints (echoCancellation, noiseSuppression, autoGainControl) we wszystkich getUserMedia (~4 miejsca). 2) W handleVisibilityChange: sprawdzic czy sciezki zyja, jesli nie -- reacquire przed reconnectem |
| `src/components/meeting/MeetingLobby.tsx` | Dodac audio constraints w getUserMedia preview (~1 miejsce) |

### Szczegoly techniczne

**Stala audio constraints** (na gorze VideoRoom.tsx):
```text
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
```

**VideoRoom.tsx init (linia 671)**:
```text
// Zamiast: getUserMedia({ audio: true, video: true })
getUserMedia({ audio: AUDIO_CONSTRAINTS, video: true })
```

To samo dla 3 pozostalych miejsc w VideoRoom (restoreCamera, reacquireLocalStream, fallback).

**MeetingLobby.tsx (linia 48)**:
```text
getUserMedia({ video: true, audio: AUDIO_CONSTRAINTS })
```

**handleVisibilityChange (linia 611-658)**:
Dodac na poczatku (po `if (document.hidden)` check):
```text
let stream = localStreamRef.current;
const tracksAlive = stream?.getTracks().some(t => t.readyState === 'live');
if (!stream || !tracksAlive) {
  console.log('[VideoRoom] Stream dead after visibility change, re-acquiring...');
  stream = await reacquireLocalStream();
  if (!stream) return;
}
```
Oraz zamienic uzycie `stream` w dalszej czesci handlera (callPeer) na swiezy strumien.

