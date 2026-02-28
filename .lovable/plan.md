

## Naprawa: sprzezenia audio w trybach speaker/multi-speaker

### Problem

W trybie galerii kazdy uczestnik ma JEDEN element `<video>` z `muted={participant.isLocal}` — audio gra poprawnie.

W trybie speaker/multi-speaker:
1. Ten sam MediaStream jest przypisany do DWOCH elementow `<video>` (glowny tile + miniaturka). Nawet jesli miniaturka jest muted, przegladarki moga miec problem z echo cancellation gdy ten sam stream jest na dwoch elementach.
2. Uczestnicy w miniaturkach maja `muted` bezwarunkowo — ich audio NIE GRA WCALE. Slychac tylko aktywnego mowce.

### Rozwiazanie: rozdzielenie audio od video

Dodac komponent `AudioOnlyStreams` ktory renderuje ukryte elementy `<audio>` dla WSZYSTKICH zdalnych uczestnikow. Wszystkie elementy `<video>` w trybach speaker/multi-speaker beda `muted` (tylko obraz).

**Nowy komponent: `AudioOnlyStreams`**

```text
const AudioOnlyStreams = ({ participants, onAudioBlocked }) => {
  // Renderuj ukryty <audio> dla kazdego zdalnego uczestnika
  return (
    <>
      {participants
        .filter(p => !p.isLocal && p.stream)
        .map(p => (
          <AudioElement key={p.peerId} stream={p.stream} onAudioBlocked={onAudioBlocked} />
        ))}
    </>
  );
};
```

**`AudioElement` — pojedynczy element `<audio>`:**

```text
const AudioElement = ({ stream, onAudioBlocked }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {
      // fallback jak w playVideoSafe
    });
  }, [stream]);
  return <audio ref={ref} autoPlay />;
};
```

### Zmiany w VideoGrid

**1. VideoTile — nowy prop `forceAudioMuted`**

Dodac opcjonalny prop `forceAudioMuted?: boolean`. Gdy `true`, element `<video>` jest zawsze `muted`:

```text
muted={participant.isLocal || forceAudioMuted}
```

**2. GalleryLayout — bez zmian**

W galerii kazdy video gra audio normalnie (`forceAudioMuted` nie jest ustawiony). Zachowanie identyczne jak dotychczas.

**3. Speaker mode — `forceAudioMuted` + AudioOnlyStreams**

```text
return (
  <div className="flex-1 flex flex-col bg-black relative">
    <AudioOnlyStreams participants={allParticipants} onAudioBlocked={onAudioBlocked} />
    <div className="flex-1 relative">
      <VideoTile
        participant={activeSpeaker}
        forceAudioMuted={true}  // audio gra z AudioOnlyStreams
        ...
      />
    </div>
    {showThumbnails && (
      <div>
        {allParticipants.map((p, index) => (
          <ThumbnailTile ... />  // juz muted — bez zmian
        ))}
      </div>
    )}
  </div>
);
```

**4. MultiSpeakerLayout — `forceAudioMuted` + AudioOnlyStreams**

Dodac `AudioOnlyStreams` na poczatku. VideoTile w glownym obszarze dostaje `forceAudioMuted={true}`. MiniVideo w pasku juz jest muted — bez zmian.

### Diagram

```text
GALERIA:
  Uczestnik A: <video muted={isLocal}> -- audio gra z video
  Uczestnik B: <video muted={isLocal}> -- audio gra z video

SPEAKER / MULTI-SPEAKER (po naprawie):
  <audio> A  -- audio ZAWSZE gra (ukryty element)
  <audio> B  -- audio ZAWSZE gra (ukryty element)
  
  Glowny tile:  <video muted> -- tylko obraz
  Miniaturki:   <video muted> -- tylko obraz (jak dotychczas)
```

### Efekt

- Audio gra z JEDNEGO zrodla na uczestnika (element `<audio>`), niezaleznie od layoutu
- Brak duplikacji streamow na dwoch elementach = brak sprzezen
- Wszyscy uczestnicy sa slyszalni, nie tylko aktywny mowca
- Galeria dziala bez zmian

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | Nowy komponent AudioOnlyStreams + AudioElement, prop forceAudioMuted w VideoTile, uzycie w speaker i multi-speaker |

### Ryzyko

Niskie. Zmiana dotyczy tylko routingu audio. Galeria nie jest modyfikowana. Elementy `<audio>` sa standardowym sposobem odtwarzania audio w WebRTC.

