

# Fix: Mobile/PWA audio blocked + auto-rejoin

## Root Cause Analysis

### Problem 1: Mobile auto-rejoin disabled
`getSavedSession()` and `tryAutoRejoin()` both return `null`/`false` on mobile/PWA due to `isMobileOrPWA()` guard. User always sees lobby after refresh.

### Problem 2: Audio blocked even after lobby join on mobile
The "Dołącz" click in lobby calls `handleJoin` which sets `userHasInteracted = true` and creates an AudioContext. But this is **not sufficient on iOS Safari**. iOS requires an actual **media element play** in the gesture call stack to unlock the audio session. Our `AudioContext.resume()` does not fully unlock `<video>.play()` with audio tracks on iOS.

When remote streams arrive seconds later, `video.play()` is called outside gesture context → blocked → falls into muted fallback or retry loops that also fail.

**Why clicking mic/camera fixes it**: `handleToggleMute` calls `reacquireLocalStream()` (because tracks are ended after refresh), which calls `getUserMedia` in gesture context + `replaceTrack`. The `unlockAudio` click handler also runs, unmuting all `<video>` elements. Both happen IN the click gesture → iOS allows it.

## Plan

### Change 1: Enable mobile auto-rejoin (MeetingRoom.tsx)
Remove `isMobileOrPWA()` guard from `getSavedSession()` and `tryAutoRejoin()`. On mobile, getUserMedia will be called in VideoRoom's `init()` — it should succeed if permission was already granted. Remote audio will be blocked until first touch, which we handle with `unlockAudio`.

### Change 2: Silent audio unlock in gesture context (MeetingRoom.tsx)
In `handleJoin`, play a silent WAV Data URI via `new Audio()` **synchronously** in the click handler. This unlocks the iOS audio session for all subsequent media elements.

```typescript
const handleJoin = (...) => {
  setUserHasInteracted();
  // Unlock iOS audio session with actual media playback in gesture context
  try {
    const silence = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
    silence.play().catch(() => {});
  } catch {}
  try { const ctx = new AudioContext(); ctx.resume()...; } catch {}
  ...
};
```

### Change 3: Silent audio unlock in VideoRoom unlockAudio (VideoRoom.tsx)
In the `unlockAudio` handler (touchstart/click), also play a silent Audio to ensure iOS audio session is unlocked before unmuting video elements.

### Change 4: Auto-rejoin stream re-acquire + audio unlock (VideoRoom.tsx)
In `init()`, after acquiring the stream, also play a silent Audio to try to unlock the audio session (even without gesture — it won't hurt and may work on some browsers). Add a toast on mobile auto-rejoin: "Dotknij ekranu, aby odblokować dźwięk" if no user interaction detected.

### Change 5: playVideoSafe - play silent Audio before retry (VideoGrid.tsx)
When `userHasInteracted` is true but `video.play()` fails, try playing a silent Audio first, then retry the video. This gives iOS another chance to recognize the audio session.

| File | Change |
|---|---|
| `MeetingRoom.tsx` | Remove mobile auto-rejoin guard + silent audio in handleJoin |
| `VideoRoom.tsx` | Silent audio in unlockAudio + toast on mobile auto-rejoin |
| `VideoGrid.tsx` | Silent audio before retry in playVideoSafe |

