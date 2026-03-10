

# Fix: Brak video/audio drugiego użytkownika po dołączeniu

## Diagnoza

Z logów sieciowych wynika, że po (re)dołączeniu biuro, **wszystkie zapytania GET do `meeting_room_participants` zwracają tylko biuro** — enterpiaseczno NIE jest w bazie jako aktywny uczestnik.

Jednocześnie widać `Connection timeout for peer: f0a43012...` — biuro próbuje połączyć się ze starym peer_id enterpiaseczno, który już nie istnieje na serwerze PeerJS.

Zidentyfikowałem **3 luki** w kodzie powodujące ten problem:

### 1. Connection timeout nie triggeruje reconnect
`handleCall` (linia 1508-1513): po 15s timeout usuwa peer z `connectionsRef` ale **nie wywołuje reconnect ani retry**. Peer po prostu "znika" z mapy połączeń i nikt go nie odtwarza.

### 2. Heartbeat nie nawiązuje brakujących połączeń
Heartbeat (co 15s) sprawdza DB i czyści ghost participantów, ale **nie próbuje nawiązać połączenia** z peerami które są aktywne w DB ale nie mają wpisu w `connectionsRef`. Robi to tylko visibility change handler.

### 3. DB INSERT handler blokowany przez brak localStream
Linia 897: `if (!connectionsRef.current.has(newRow.peer_id) && localStreamRef.current)` — jeśli Realtime INSERT przychodzi **zanim** `localStreamRef.current` zostanie ustawiony (podczas init), call jest pomijany i nigdy nie jest ponawiany.

## Plan naprawy (1 plik: `VideoRoom.tsx`)

### Zmiana 1: Connection timeout → reconnect zamiast silent drop
W `handleCall` (linia 1508-1513), po timeout wywołać `reconnectToPeer` zamiast tylko usuwać z mapy:

```typescript
const timeout = setTimeout(() => {
  if (connectionsRef.current.get(call.peer) !== call) return;
  console.warn('[VideoRoom] Connection timeout for peer:', call.peer);
  connectionsRef.current.delete(call.peer);
  reconnectToPeer(call.peer); // ← dodane
}, 15000);
```

### Zmiana 2: Heartbeat nawiązuje brakujące połączenia
W bloku heartbeat (po synchronizacji uczestników, ~linia 790), dodać logikę analogiczną do visibility handler — dla każdego aktywnego peera z DB sprawdzić czy mamy połączenie w `connectionsRef`, jeśli nie — wywołać `callPeer`:

```typescript
// After pruning ghost participants:
for (const p of activeParticipants) {
  if (!p.peer_id) continue;
  if (user && p.user_id === user.id) continue;
  if (guestTokenId && p.guest_token_id === guestTokenId) continue;
  if (!connectionsRef.current.has(p.peer_id) && localStreamRef.current && peerRef.current) {
    console.log(`[VideoRoom] Heartbeat: reconnecting to missing peer ${p.peer_id}`);
    callPeer(p.peer_id, p.display_name || 'Uczestnik', localStreamRef.current, undefined, p.user_id || undefined);
  }
}
```

### Zmiana 3: DB INSERT handler — fallback gdy localStream brak
Linia 897: gdy `localStreamRef.current` jest null, zaplanować retry po 2s:

```typescript
if (!connectionsRef.current.has(newRow.peer_id)) {
  if (localStreamRef.current) {
    callPeer(newRow.peer_id, ...);
  } else {
    // Stream not ready yet — retry in 2s
    setTimeout(() => {
      if (!connectionsRef.current.has(newRow.peer_id) && localStreamRef.current) {
        callPeer(newRow.peer_id, ...);
      }
    }, 2000);
  }
}
```

| Zmiana | Opis |
|---|---|
| handleCall timeout → reconnect | Timeout nie "gubi" peera — triggeruje reconnect |
| Heartbeat reconnect | Co 15s sprawdza i naprawia brakujące połączenia |
| DB INSERT retry | Opóźniony retry gdy stream jeszcze nie gotowy |

