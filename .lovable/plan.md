

# Fix: Auto-rejoin pomija odblokowanie audio + brak dźwięku biuro→enterpiaseczno

## Diagnoza

### Problem A: Zdalne audio zablokowane po odświeżeniu (oba kierunki)

Log potwierdza: `[VideoGrid] Autoplay blocked — playing muted` na desktopie biuro.

**Przyczyna**: Na desktopie po odświeżeniu, `getSavedSession()` zwraca zapisaną sesję → status = `'joined'` natychmiast → **`handleJoin` NIE jest wywoływany** → `setUserHasInteracted()` i AudioContext warm-up dodane w `handleJoin` są kompletnie pomijane.

Flaga `userHasInteracted` pozostaje `false`, co powoduje:
- `playVideoSafe` wpada w fallback muted (linia 62)
- Retry po 2s (linia 71) **nie odpala** bo `userHasInteracted` jest false
- Audio drugiego uczestnika jest zablokowane do pierwszego kliknięcia

### Problem B: Biuro nie przekazuje dźwięku do enterpiaseczno

Log: `[VideoRoom] Attempting to re-acquire local stream...` (13:41:45) i `Stream re-acquired successfully` → toast "Multimedia przywrócone".

**Przyczyna**: Początkowy stream po auto-rejoin ma track audio, który umiera w ciągu ~43s. `reacquireLocalStream` jest wywoływane przez freeze detector (wykrywa dead video track). Nowy stream jest tworzony, ale:
- `replaceTrack` na istniejących połączeniach jest wykonywany w momencie re-acquire (13:41:45)
- Połączenie do enterpiaseczno jest nawiązywane PÓŹNIEJ (ICE connected 13:41:53)
- To połączenie mogło być zainicjowane ze STARYM (dead) streamem, a `replaceTrack` go nie złapał

Kliknięcie mikrofonu wywołuje `handleToggleMute` → wykrywa dead audio tracks → ponowne `reacquireLocalStream` → `replaceTrack` na TERAZ już nawiązanym połączeniu → audio wraca.

## Plan zmian

### Zmiana 1: `MeetingRoom.tsx` — setUserHasInteracted na auto-rejoin

Gdy `savedSession` istnieje (auto-rejoin), wywołać `setUserHasInteracted()` na mount (w useEffect). Użytkownik miał gest w poprzedniej sesji, więc to bezpieczne.

```typescript
// Dodać useEffect na początku komponentu
useEffect(() => {
  if (savedSession) {
    setUserHasInteracted();
    try { 
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); 
      ctx.resume().then(() => ctx.close()).catch(() => ctx.close()); 
    } catch {}
  }
}, []);
```

### Zmiana 2: `VideoRoom.tsx` — setUserHasInteracted w init()

Na początku `init()` wywołać `setUserHasInteracted()` — niezależnie od ścieżki dojścia (lobby, auto-rejoin, mobile). Jeśli VideoRoom się montuje, to znaczy że użytkownik przeszedł przez jakiś flow dołączenia.

### Zmiana 3: `VideoRoom.tsx` — track sync po ICE connected

W `handleCall`, w ICE state change handler (linia 1642), po `state === 'connected'`, sprawdzić czy lokalny audio sender ma live track. Jeśli nie — zastąpić trackiem z `localStreamRef.current`:

```typescript
if (state === 'connected' || state === 'completed') {
  reconnectAttemptsRef.current.delete(call.peer);
  // Verify local audio is being sent
  const senders = pc.getSenders();
  const audioSender = senders.find(s => s.track?.kind === 'audio');
  const currentAudioTrack = localStreamRef.current?.getAudioTracks()[0];
  if (audioSender && currentAudioTrack && 
      (audioSender.track?.readyState === 'ended' || !audioSender.track)) {
    audioSender.replaceTrack(currentAudioTrack).catch(() => {});
  }
  // Also verify video
  const videoSender = senders.find(s => s.track?.kind === 'video');
  const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0];
  if (videoSender && currentVideoTrack &&
      (videoSender.track?.readyState === 'ended' || !videoSender.track)) {
    videoSender.replaceTrack(currentVideoTrack).catch(() => {});
  }
}
```

### Zmiana 4: `VideoGrid.tsx` — playVideoSafe nie mutuje gdy userHasInteracted

Gdy `userHasInteracted` jest true od początku, nie robić fallback na muted — zamiast tego retry unmuted play po 500ms:

```typescript
const playVideoSafe = async (video, isLocal, onAudioBlocked) => {
  if (isLocal) { video.play().catch(() => {}); return; }
  try {
    await video.play();
  } catch {
    if (userHasInteracted) {
      // User already interacted — retry unmuted after short delay
      setTimeout(() => {
        video.play().catch(() => {
          // Last resort: muted fallback
          video.muted = true;
          video.play().catch(() => {});
        });
      }, 500);
    } else {
      video.muted = true;
      try { await video.play(); onAudioBlocked?.(); } catch {}
    }
  }
};
```

| Plik | Zmiana |
|---|---|
| `MeetingRoom.tsx` | setUserHasInteracted + AudioContext na auto-rejoin |
| `VideoRoom.tsx` | setUserHasInteracted w init() |
| `VideoRoom.tsx` | Track sync po ICE connected |
| `VideoGrid.tsx` | playVideoSafe retry unmuted gdy userHasInteracted |

