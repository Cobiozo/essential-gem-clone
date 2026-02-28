
## Naprawa: Brak video/audio przy pierwszym wejsciu w webinar

### Przyczyna

Lobby w `MeetingLobby.tsx` **zatrzymuje** strumien kamery/mikrofonu (`stream.getTracks().forEach(t => t.stop())`) w momencie klikniecia "Dolacz". Nastepnie po 500ms opoznienia (setTimeout w MeetingRoom.tsx) i renderowaniu React, `VideoRoom` montuje sie i probuje ponownie wywolac `getUserMedia` wewnatrz `useEffect`. Problem: przegladarki (szczegolnie Safari i Chrome mobile) wymagaja, aby `getUserMedia` bylo wywolane **bezposrednio** w kontekscie gestu uzytkownika (klikniecia). Po 500ms + re-renderze ten kontekst jest utracony, wiec przeglądarka blokuje dostep do kamery/mikrofonu.

Dopiero reczne klikniecie "wylacz/wlacz kamere" w VideoRoom przywraca dostep, bo to klikniecie jest nowym gestem uzytkownika.

### Rozwiazanie

Zamiast zatrzymywac strumien w lobby i ponownie go zdobywac w VideoRoom, **przekaz istniejacy strumien z lobby do VideoRoom**:

1. **MeetingLobby.tsx** -- nie zatrzymuj strumienia, przekaz go dalej:
   - Zmien sygnature `onJoin` na `(audio, video, settings?, stream?)` 
   - W `handleJoin`: zamiast `previewStream.getTracks().forEach(t => t.stop())`, przekaz `previewStream` jako argument `onJoin`

2. **MeetingRoom.tsx** -- przechowaj strumien i przekaz do VideoRoom:
   - Dodaj state `lobbyStream` przechowujacy strumien z lobby
   - W `handleJoin`: zapisz strumien do `lobbyStream`
   - Przekaz `lobbyStream` jako nowy prop `initialStream` do VideoRoom

3. **VideoRoom.tsx** -- uzyj przekazanego strumienia zamiast ponownego `getUserMedia`:
   - Dodaj opcjonalny prop `initialStream?: MediaStream`
   - W `init()`: jesli `initialStream` jest dostepny i ma zywe tracki, uzyj go zamiast wolac `getUserMedia`
   - Zastosuj odpowiednie ustawienia audio/video (enabled/disabled) na przekazanym strumieniu
   - Dodaj listenery `ended` tak samo jak przy nowym strumieniu

### Szczegoly techniczne

**MeetingLobby.tsx -- handleJoin:**
```text
const handleJoin = () => {
  // NIE zatrzymuj strumienia - przekaz go dalej
  onJoin(audioEnabled, videoEnabled, isHost ? meetingSettings : undefined, previewStream || undefined);
};
```

Sygnatura `onJoin` zmienia sie na:
```text
onJoin: (audio: boolean, video: boolean, settings?: MeetingSettings, stream?: MediaStream) => void;
```

**MeetingRoom.tsx -- handleJoin + lobbyStream:**
```text
const [lobbyStream, setLobbyStream] = useState<MediaStream | null>(null);

const handleJoin = (audio, video, settings, stream) => {
  setAudioEnabled(audio);
  setVideoEnabled(video);
  if (settings) setInitialSettings(settings);
  if (stream) setLobbyStream(stream);
  setIsConnecting(true);
  setTimeout(() => {
    setStatus('joined');
    setIsConnecting(false);
  }, 500);
};

// W renderze VideoRoom:
<VideoRoom ... initialStream={lobbyStream} />
```

**VideoRoom.tsx -- init() z initialStream:**
```text
// Nowy prop:
initialStream?: MediaStream;

// W init():
let stream: MediaStream;
const lobbyStreamAlive = initialStream?.getTracks().some(t => t.readyState === 'live');

if (initialStream && lobbyStreamAlive) {
  // Uzyj strumienia z lobby - nie wywoluj getUserMedia
  stream = initialStream;
} else {
  // Fallback: zdobadz nowy strumien (np. jesli lobby nie mial streamu)
  stream = await navigator.mediaDevices.getUserMedia({ ... });
}

stream.getAudioTracks().forEach(t => (t.enabled = initialAudio));
stream.getVideoTracks().forEach(t => (t.enabled = initialVideo));
```

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/MeetingLobby.tsx` | Nie zatrzymuj strumienia, przekaz go w `onJoin` |
| `src/pages/MeetingRoom.tsx` | Przechowaj `lobbyStream`, przekaz jako prop do VideoRoom |
| `src/components/meeting/VideoRoom.tsx` | Dodaj prop `initialStream`, uzyj go w `init()` zamiast `getUserMedia` |

### Wazne

- Cleanup strumienia lobby jest teraz odpowiedzialnoscia VideoRoom (przy `cleanup()` wszystkie tracki sa zatrzymywane)
- Fallback na `getUserMedia` nadal istnieje jesli strumien z lobby jest niedostepny (np. guest bez kamery)
- Ta zmiana eliminuje problem na WSZYSTKICH przegladarkach, nie tylko mobile
