

# Fix: WebRTC signal loss after page refresh

## Diagnosis

From console logs and network requests I can see three interrelated issues:

### 1. `beforeunload` PATCH deactivates the NEW participant record

The `beforeunload` handler (line 712-717) sends a keepalive fetch:
```
PATCH meeting_room_participants?room_id=eq.X&user_id=eq.Y
body: {is_active: false}
```
This fires when the page starts unloading. But since it's a keepalive fetch (async), it can arrive at Supabase **after** the new page has already done DELETE+INSERT with the fresh `peer_id`. The PATCH filters only by `room_id` + `user_id` — so it deactivates the **new** record too.

Visible in network logs: 3 PATCH requests at 12:53:44, including one setting `is_active: true` from the heartbeat, creating a race.

### 2. `peer-unavailable` permanently removes participants

When the DB INSERT subscription (line 880) detects a new peer_id and calls `callPeer()`, the remote peer might not be fully registered on PeerJS signaling server yet. PeerJS throws `peer-unavailable`, and the error handler (line 1416-1418) calls `removePeer()` — permanently removing that participant from the grid. This is wrong; it should retry.

### 3. Stale heartbeat overwrites cleanup

The heartbeat PATCH (`is_active: true`) can race with the cleanup PATCH (`is_active: false`), momentarily resurrecting a departing participant.

## Plan (1 file)

### `src/components/meeting/VideoRoom.tsx`

**Fix 1: Add `peer_id` filter to `beforeunload` PATCH** (~line 712-717)

Cache the current peerId at the start of the handler, then include it in the PATCH filter:
```typescript
const peerIdAtUnload = peerRef.current?.id;
// ...
const url = `...?room_id=eq.${roomId}&user_id=eq.${user.id}&peer_id=eq.${peerIdAtUnload}`;
```
This ensures the PATCH only deactivates the OLD record (matching the old peer_id), not the freshly inserted one.

Same fix for the guest branch (line 718-723).

**Fix 2: Retry on `peer-unavailable` instead of removing** (~line 1414-1424)

Replace the `removePeer(failedPeerId)` call with a delayed retry:
```typescript
if (err.type === 'peer-unavailable') {
  const failedPeerId = ...;
  if (failedPeerId) {
    const retryCount = (peerRetryCountRef.current.get(failedPeerId) || 0) + 1;
    peerRetryCountRef.current.set(failedPeerId, retryCount);
    if (retryCount <= 3) {
      setTimeout(() => {
        // Re-check DB if peer is still active, then retry call
      }, retryCount * 3000);
    } else {
      peerRetryCountRef.current.delete(failedPeerId);
      removePeer(failedPeerId);
    }
  }
}
```

Add `peerRetryCountRef = useRef(new Map<string, number>())` for tracking retries. Reset counter when a connection succeeds.

**Fix 3: Guard heartbeat with peer_id** (~line 755)

Add the current `peer_id` to the heartbeat PATCH filter so it won't resurrect an old record:
```typescript
await supabase.from('meeting_room_participants')
  .update({ updated_at: now, is_active: true, left_at: null })
  .eq('room_id', roomId).eq('user_id', user.id)
  .eq('peer_id', peerIdValue);  // Only update OUR record
```

