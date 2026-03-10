

# Fix: Speaker view doesn't switch video to active speaker

## Root Cause

In `useActiveSpeakerDetection` (VideoGrid.tsx line 503):

```typescript
if (!p.stream || analysersRef.current.has(p.peerId)) return;
```

Analysers are created once per `peerId` and **never recreated when the stream changes**. After reconnection, stream re-acquire, or any WebRTC renegotiation, the participant gets a new `MediaStream` object, but the analyser remains connected to the old (dead) stream. The old stream produces silence → no speaker is ever detected → view never switches.

## Fix

Track stream IDs alongside analysers. When a participant's stream ID changes, disconnect the old analyser and create a new one for the current stream.

### Change: `useActiveSpeakerDetection` in `VideoGrid.tsx`

1. Add a `streamIdMap` ref to track which stream ID each analyser was created for.
2. In the participant loop, compare current `p.stream.id` against stored stream ID — if different, disconnect old analyser and recreate.

```typescript
// Add ref:
const streamIdMapRef = useRef<Map<string, string>>(new Map());

// Replace the guard in the participant loop:
participants.forEach((p) => {
  if (!p.stream) return;
  const audioTracks = p.stream.getAudioTracks();
  if (audioTracks.length === 0) return;
  
  const currentStreamId = p.stream.id;
  const existingStreamId = streamIdMapRef.current.get(p.peerId);
  
  // Skip if analyser already exists for THIS stream
  if (analysersRef.current.has(p.peerId) && existingStreamId === currentStreamId) return;
  
  // Disconnect old analyser if stream changed
  if (analysersRef.current.has(p.peerId)) {
    try { analysersRef.current.get(p.peerId)!.source.disconnect(); } catch {}
    analysersRef.current.delete(p.peerId);
  }
  
  try {
    const source = ctx.createMediaStreamSource(p.stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analysersRef.current.set(p.peerId, { analyser, source });
    streamIdMapRef.current.set(p.peerId, currentStreamId);
  } catch (e) {
    console.warn('[VideoGrid] Failed to create analyser for', p.peerId, e);
  }
});
```

Also clean up `streamIdMapRef` entries alongside `analysersRef` when participants leave.

| File | Change |
|---|---|
| `VideoGrid.tsx` | Track stream IDs, recreate analysers when stream changes |

