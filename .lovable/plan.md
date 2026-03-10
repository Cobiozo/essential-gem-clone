

# Fix: Video enterpiaseczno nie wyświetla się po reconnect

## Diagnoza

Znalazłem główną przyczynę w `VideoGrid.tsx`, linia 229:

```typescript
const showVideo = participant.isLocal
    ? participant.stream && !isCameraOff
    : participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live');
```

Dla zdalnych uczestników, video jest wyświetlane **tylko** gdy track wideo ma `enabled === true` ORAZ `readyState === 'live'`. Problem:

1. Gdy biuro odświeża stronę i nawiązuje nowe połączenie z enterpiaseczno, strumień przychodzi z trackiem wideo
2. Track może nie być od razu w stanie `live` (krótkie opóźnienie WebRTC) — pierwsze renderowanie widzi avatar
3. Gdy track staje się `live`, **nic nie wymusza ponownego renderowania Reacta** — `showVideo` pozostaje `false` (stale)
4. Dlatego kliknięcie mikrofonu/kamery "naprawia" problem — wymusza re-render, `showVideo` przelicza się i widzi `live` track

Innymi słowy: zmiana stanu tracka (readyState, enabled) nie powoduje re-renderowania komponentu VideoTile.

## Plan naprawy (1 plik)

### `src/components/meeting/VideoGrid.tsx` — VideoTile

Dodać state `trackRevision` + nasłuchiwać na zdarzenia tracków (`mute`/`unmute`/`ended`) aby wymusić re-render gdy stan tracka się zmienia:

```typescript
const [trackRevision, setTrackRevision] = useState(0);

useEffect(() => {
  const stream = participant.stream;
  if (!stream) return;
  
  const bump = () => setTrackRevision(r => r + 1);
  
  const tracks = stream.getTracks();
  tracks.forEach(t => {
    t.addEventListener('mute', bump);
    t.addEventListener('unmute', bump);
    t.addEventListener('ended', bump);
  });
  stream.addEventListener('addtrack', bump);
  stream.addEventListener('removetrack', bump);
  
  return () => {
    tracks.forEach(t => {
      t.removeEventListener('mute', bump);
      t.removeEventListener('unmute', bump);
      t.removeEventListener('ended', bump);
    });
    stream.removeEventListener('addtrack', bump);
    stream.removeEventListener('removetrack', bump);
  };
}, [participant.stream]);
```

To samo w `ThumbnailTile` (linia 317-319), który ma identyczną logikę `showVideo`.

| Zmiana | Opis |
|---|---|
| `VideoTile`: track state listener | Wymusza re-render gdy track zmienia readyState/enabled → `showVideo` się aktualizuje |
| `ThumbnailTile`: to samo | Miniaturka również reaguje na zmiany tracka |

