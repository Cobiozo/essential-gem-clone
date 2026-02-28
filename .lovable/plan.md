

## Naprawa 4 problemow: ukrycie ekranu na mobile, zamrazanie przy zmianie tla, PiP re-entry

### Problem 1: Przycisk udostepniania ekranu na mobile
Przycisk jest nieaktywny z tooltipem, ale tooltip nie dziala dobrze na urzadzeniach dotykowych. Rozwiazanie: calkowicie ukryc przycisk gdy `isScreenShareSupported === false`.

**Plik**: `src/components/meeting/MeetingControls.tsx`
- Zmienic warunek renderowania przycisku "Ekran" z `{!guestMode && (...)}` na `{!guestMode && isScreenShareSupported && (...)}`.

### Problem 2: Zamrazanie video przy zmianie/wylaczaniu tla

**Przyczyna**: `handleBackgroundChange` przekazuje do `applyBackground` aktualny `localStreamRef.current`, ktory jest PRZETWORZONYM strumieniem (z `captureStream()`). Gdy `processor.stop()` jest wywolywany (przy zmianie trybu lub powrocie na "brak efektu"), stary output stream umiera. Nastepnie `processor.start()` probuje uzyc tracka z martwego strumienia -- efekt: zawieszenie lub utrata video.

**Rozwiazanie**: Przechowywac referencje do ORYGINALNEGO strumienia z kamery (`rawStreamRef`) w `useVideoBackground`. Przy kazdym przelaczeniu trybu uzywac tego surowego strumienia zamiast przetworzonego.

**Plik**: `src/hooks/useVideoBackground.ts`
- Dodac `rawStreamRef = useRef<MediaStream | null>(null)`.
- W `applyBackground`: przy pierwszym uzyciu zapisac `inputStream` do `rawStreamRef`. Przy kolejnych przelaczeniach zawsze uzywac `rawStreamRef.current` jako input.
- W `stopBackground`: NIE czysc `rawStreamRef` (kamera nadal zyje).
- Dodac `setRawStream` do aktualizacji ref gdy strumien kamery sie zmieni (np. po reacquire).

**Plik**: `src/components/meeting/VideoRoom.tsx`
- W `handleBackgroundChange`: gdy `newMode === 'none'`, po `applyBackground` przywrocic `localStreamRef.current` na surowy strumien (rawStream) i zaktualizowac track u peerow.
- W `reacquireLocalStream`: po uzyskaniu nowego strumienia, zaktualizowac rawStream w hooku.

### Problem 3: PiP na mobile -- nie mozna ponownie uruchomic

**Przyczyna**: `activeVideoRef.current` moze wskazywac na nieaktualny element `<video>` po przebudowaniu VideoGrid (np. po zmianie uczestnikow). Gdy element jest nieaktualny lub nie ma `srcObject`, `requestPictureInPicture()` fails silently.

**Rozwiazanie**: W `handleTogglePiP`, jesli `activeVideoRef.current` jest null lub nie ma srcObject, wyszukac aktywne video z DOM jako fallback (tak jak robi to auto-PiP).

**Plik**: `src/components/meeting/VideoRoom.tsx`
- W `handleTogglePiP`: dodac fallback szukajacy video z `srcObject` i `videoWidth > 0` jesli `activeVideoRef.current` jest niedostepny.

### Problem 4: Desktop auto-PiP -- po powrocie nie wchodzi ponownie

**Przyczyna**: `autoPiPRef` jest zwyklym obiektem `{ current: false }` tworzonym w useEffect. Przy wyjsciu z PiP przez przycisk uzytkownika (nie przez auto), `autoPiPRef.current` pozostaje `true`, ale `document.exitPictureInPicture()` nie jest wolany. Nastepnie przy kolejnym ukryciu karty, warunek `if (document.pictureInPictureElement) return` blokuje ponowne wejscie.

Takze: `leavepictureinpicture` listener dodawany z `{ once: true }` w recznym toggle (linia 1383) nie jest sprzezony z `autoPiPRef`, co moze zostawic `autoPiPRef.current === true` nawet po recznym wyjsciu.

**Rozwiazanie**:
- Uzyc `useRef` dla `autoPiPRef` zeby przetrwal re-rendery.
- Dodac globalny listener `leavepictureinpicture` ktory zawsze resetuje stan (zamiast `{ once: true }`).
- W handleTogglePiP rowniez resetowac `autoPiPRef`.

**Plik**: `src/components/meeting/VideoRoom.tsx`
- Zamienic lokalne `autoPiPRef` na `useRef`.
- W `handleTogglePiP`: przy wyjsciu z PiP ustawic `autoPiPRef.current = false`.
- W auto-PiP useEffect: sluchac na `leavepictureinpicture` na `document` aby zawsze resetowac stan.

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/MeetingControls.tsx` | Ukryc przycisk ekranu gdy `!isScreenShareSupported` |
| `src/hooks/useVideoBackground.ts` | Dodac `rawStreamRef`, uzywac go przy przelaczaniu trybow |
| `src/components/meeting/VideoRoom.tsx` | Fix handleBackgroundChange (rawStream), PiP fallback, autoPiP ref |

### Szczegoly techniczne

**useVideoBackground.ts -- rawStreamRef**:
```text
const rawStreamRef = useRef<MediaStream | null>(null);

const applyBackground = async (inputStream, newMode, imageSrc) => {
  // Zapisz oryg. stream przy pierwszym uzyciu lub jesli sie zmienil
  if (!rawStreamRef.current || rawStreamRef.current.getTracks().every(t => t.readyState === 'ended')) {
    rawStreamRef.current = inputStream;
  }
  const sourceStream = rawStreamRef.current;

  if (newMode === 'none') {
    processor.stop();
    setMode('none');
    return sourceStream; // zwroc SUROWY stream, nie przetworzony
  }

  processor.stop(); // bezpiecznie zatrzymaj stary pipeline
  processor.setOptions({ mode: newMode, backgroundImage: bgImage });
  const output = await processor.start(sourceStream); // uzyj SUROWEGO
  return output;
};

// Eksportuj setter do aktualizacji raw stream po reacquire
const updateRawStream = (stream: MediaStream) => {
  rawStreamRef.current = stream;
};
```

**VideoRoom.tsx -- handleBackgroundChange fix**:
```text
const handleBackgroundChange = async (newMode, imageSrc) => {
  const stream = localStreamRef.current;
  if (!stream) return;
  const processedStream = await applyBackground(stream, newMode, imageSrc);
  // Zawsze aktualizuj local stream i tracki u peerow
  localStreamRef.current = processedStream;
  setLocalStream(processedStream);
  const videoTrack = processedStream.getVideoTracks()[0];
  if (videoTrack) {
    connectionsRef.current.forEach(conn => {
      const sender = conn.peerConnection?.getSenders()?.find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
    });
  }
};
```

**VideoRoom.tsx -- PiP fallback**:
```text
const handleTogglePiP = async () => {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
    setIsPiPActive(false);
    autoPiPRef.current = false;
    return;
  }
  // Fallback: szukaj aktywnego video
  let pipVideo = activeVideoRef.current;
  if (!pipVideo?.srcObject || !pipVideo.videoWidth) {
    const allVideos = document.querySelectorAll('video');
    pipVideo = Array.from(allVideos).find(v => v.srcObject && v.videoWidth > 0 && !v.paused) || null;
  }
  if (pipVideo) {
    await pipVideo.requestPictureInPicture();
    setIsPiPActive(true);
  }
};
```

**VideoRoom.tsx -- autoPiP useRef**:
```text
const autoPiPRef = useRef(false); // na poziomie komponentu, nie wewnatrz useEffect

// W auto-PiP useEffect:
// Dodac listener na document ktory resetuje stan
const handleLeavePiP = () => {
  autoPiPRef.current = false;
  setIsPiPActive(false);
};
document.addEventListener('leavepictureinpicture', handleLeavePiP);
return () => document.removeEventListener('leavepictureinpicture', handleLeavePiP);
```
