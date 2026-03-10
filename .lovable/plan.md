

# Fix: Black screen instead of avatar when camera is turned off

## Root Cause

When a user turns off their camera via the bottom controls, they set `track.enabled = false` on their local video track. However, **WebRTC does not propagate `track.enabled` to the remote side**. The remote peer's track remains `enabled: true` and `readyState: 'live'` — it just sends black frames.

The `showVideo` logic for remote participants currently checks:
```typescript
participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live')
```

This returns `true` even when the remote user has their camera off, because the track appears live and enabled on the receiving end. Result: black video is shown instead of the avatar/initials fallback.

Meanwhile, the `isCameraOff` state **is** correctly broadcast via Supabase channel (`media-state-changed` event) and stored on the `participant` object. It's just never used in the remote `showVideo` calculation.

## Fix

In all three `showVideo` calculations (VideoTile, ThumbnailTile, MiniVideo), incorporate `participant.isCameraOff` for remote participants:

```typescript
const showVideo = participant.isLocal
  ? participant.stream && !isCameraOff
  : participant.stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live') && !participant.isCameraOff;
```

This ensures that when the broadcast `isCameraOff: true` is received, the avatar/initials fallback is displayed immediately — regardless of what WebRTC reports about the track state.

### Files to change

| File | Lines | Change |
|---|---|---|
| `VideoGrid.tsx` | ~293-295 | Add `&& !participant.isCameraOff` to remote branch in VideoTile |
| `VideoGrid.tsx` | ~417-419 | Same fix in ThumbnailTile |
| `VideoGrid.tsx` | ~732-734 | Same fix in MiniVideo |

Three one-line changes, all in the same file.

