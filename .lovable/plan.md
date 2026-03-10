

# Fix: Hearing own audio in Speaker/Multi-speaker modes

## Root Cause

`VideoTile` (used for the main/large video in Speaker and Multi-speaker modes) lacks **imperative muted enforcement**. Unlike `ThumbnailTile` and `MiniVideo` which both have:

```typescript
useEffect(() => {
  if (videoRef.current) videoRef.current.muted = !playAudio;
}, [playAudio]);
```

...and set `video.muted` explicitly before calling `play()`, `VideoTile` relies solely on React's `muted` prop (`muted={!!participant.isLocal}`). React's `muted` prop is notoriously unreliable — it can desync during re-renders, which happen frequently in Speaker/Multi-speaker modes due to active speaker switching.

Additionally, the `playVideoSafe` calls in VideoTile's heartbeat (line 153-157) and pause handler (line 161-168) call `play()` without re-asserting `video.muted` first. On mobile browsers, calling `play()` can reset the muted state.

Gallery mode works because `VideoTile` renders are stable (no active speaker switching triggers re-renders), so the React prop stays in sync.

## Fix (1 file)

**`src/components/meeting/VideoGrid.tsx` — `VideoTile` component:**

1. Set `video.muted = !!participant.isLocal` imperatively in the stream useEffect BEFORE calling `playVideoSafe`
2. Add a dedicated `useEffect` for continuous muted sync (same pattern as ThumbnailTile)
3. In heartbeat and pause handlers, re-assert `video.muted` before calling `playVideoSafe`

```typescript
// In stream useEffect (line 140, before playVideoSafe):
video.srcObject = participant.stream;
video.muted = !!participant.isLocal;  // ← ADD: imperative mute before play
playVideoSafe(video, !!participant.isLocal, onAudioBlocked);

// In heartbeat (line 154):
video.muted = !!participant.isLocal;  // ← ADD
playVideoSafe(video, false, onAudioBlocked);

// In pause handler (line 165):
video.muted = !!participant.isLocal;  // ← ADD  
playVideoSafe(video, false, onAudioBlocked);

// NEW useEffect after line 198:
useEffect(() => {
  if (videoRef.current) videoRef.current.muted = !!participant.isLocal;
}, [participant.isLocal]);
```

