

# Fix: Mobile/PWA - brak video i audio po odświeżeniu

## Diagnoza

Z logów wynika, że połączenie WebRTC **nawiązuje się poprawnie** (ICE: connected dla `4f215228`). Problem jest dwuwarstwowy:

### Problem 1: Audio zablokowane przez autoplay policy
Na mobile/PWA, kliknięcie "Dołącz" w lobby to gest użytkownika, ale VideoRoom montuje się ASYNCHRONICZNIE po tym geście. Gdy remote stream przychodzi sekundy później (w callbacku `call.on('stream')`), kontekst gestu jest wygasły. `playVideoSafe` wpada w fallback `video.muted = true` → audio nie słychać.

Istniejący `unlockAudio` handler (click/touchstart) naprawia to przy NASTĘPNYM kliknięciu, dlatego kliknięcie mic/camera "naprawia" audio.

### Problem 2: Video nie wyświetla się mimo połączenia
`showVideo` sprawdza `readyState === 'live'`, ale na mobile pierwszy render może nastąpić zanim track przejdzie do `live`. `trackRevision` bump powinien to naprawić, ale jeśli track jest już `live` w momencie podpięcia listenerów, żaden event nie zostanie wyemitowany → `showVideo` zostaje `false`.

## Plan zmian

### Zmiana 1: Pre-warm audio context w MeetingRoom.tsx (handleJoin)
W `handleJoin` wywołać `setUserHasInteracted()` z VideoGrid i stworzyć AudioContext, aby "odblokować" audio jeszcze w kontekście gestu lobby Join:

```typescript
import { setUserHasInteracted } from '@/components/meeting/VideoGrid';

const handleJoin = (...) => {
  setUserHasInteracted(); // Mark interaction from lobby gesture
  // Warm up AudioContext in gesture context
  try { const ctx = new AudioContext(); ctx.resume().then(() => ctx.close()); } catch {}
  // ... existing code
};
```

### Zmiana 2: Auto-unmute w VideoRoom po pierwszym remote stream
W `handleCall` → `call.on('stream')`, po dodaniu uczestnika, natychmiast uruchomić unmute logic (odblokowanie wyciszonych video):

```typescript
call.on('stream', (remoteStream) => {
  // ... existing code (setParticipants, etc.)
  
  // Auto-unlock muted videos on mobile (gesture was in lobby)
  if (getUserHasInteracted()) {
    setTimeout(() => {
      document.querySelectorAll('video').forEach(v => {
        const video = v as HTMLVideoElement;
        if (video.muted && video.getAttribute('data-local-video') !== 'true' && video.srcObject) {
          video.muted = false;
          video.play().catch(() => {});
        }
      });
      setAudioBlocked(false);
    }, 500);
  }
});
```

### Zmiana 3: Dodatkowy trackRevision bump po timeout (VideoGrid.tsx)
W `VideoTile` i `ThumbnailTile`, po podpięciu listenerów na track, dodać jednorazowy bump po 1s aby wyłapać przypadek gdy track jest już `live` ale nie emituje eventów:

```typescript
// After attach():
const initialCheck = setTimeout(() => bump(), 1000);
return () => {
  clearTimeout(initialCheck);
  // ... existing cleanup
};
```

### Zmiana 4: playVideoSafe — retry unmuted po 2s
Gdy `playVideoSafe` wpada w fallback muted, zaplanować automatyczny retry unmuted po 2s (zakładając, że użytkownik mógł kliknąć coś w międzyczasie):

```typescript
const playVideoSafe = async (video, isLocal, onAudioBlocked) => {
  // ... existing logic (try unmuted → fallback muted)
  
  // After muted fallback succeeds, schedule unmuted retry
  if (video.muted && !isLocal && getUserHasInteracted()) {
    setTimeout(() => {
      if (video.muted && video.srcObject) {
        video.muted = false;
        video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
      }
    }, 2000);
  }
};
```

| Plik | Zmiana |
|---|---|
| `MeetingRoom.tsx` | Pre-warm AudioContext w handleJoin |
| `VideoRoom.tsx` | Auto-unmute po pierwszym remote stream |
| `VideoGrid.tsx` | Delayed trackRevision bump + playVideoSafe retry |

