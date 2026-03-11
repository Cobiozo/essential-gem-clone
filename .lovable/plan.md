

# Naprawa podwójnego uczestnika i zamrożonego obrazu w VideoRoom

## Znalezione problemy

### 1. Brak ochrony przed połączeniem z samym sobą (self-connection)
`callPeer` (linia 1658) sprawdza tylko `connectionsRef.current.has(remotePeerId)` — **nie sprawdza czy `remotePeerId === peerRef.current.id`**. Analogicznie `peer.on('call')` (linia 1480) nie sprawdza `call.peer === peerId`. Jeśli z jakiegokolwiek powodu własny peer_id trafi do listy (np. wyścig z heartbeatem, stale record w DB), host połączy się sam ze sobą — tworząc "ducha" w liście uczestników z zamrożonym/czarnym obrazem.

### 2. Bug z łańcuchowaniem `.eq()` w cleanup (linie 665, 691)
```typescript
// BUG: .eq() zwraca NOWY builder, wynik jest odrzucany!
if (cleanupPeerId) userQ.eq('peer_id', cleanupPeerId);
await userQ; // wykonuje się BEZ filtra peer_id
```
Supabase JS v2 jest niemutowalny — `.eq()` zwraca nowy obiekt. Obecny kod **ignoruje filtr peer_id**, przez co cleanup dezaktywuje WSZYSTKIE rekordy danego usera, w tym potencjalnie nowo utworzony rekord po refresh/reconnect.

### 3. Init useEffect zależy od `user` (referencji obiektu) zamiast `user?.id`
Linia 1655: `[user, roomId, guestMode, guestTokenId]` — jeśli Auth Context ustawi nowy obiekt `user` (np. podczas odzyskiwania sesji, linia 288 AuthContext), init **uruchamia się ponownie**, tworząc drugiego PeerJS peera zanim stary cleanup się zakończy (cleanup jest async).

## Zmiany

**Plik:** `src/components/meeting/VideoRoom.tsx`

### Zmiana A: Self-connection guard w `callPeer` (linia 1659)
```typescript
const callPeer = useCallback((remotePeerId: string, name: string, stream: MediaStream, avatarUrl?: string, userId?: string) => {
    if (!peerRef.current || connectionsRef.current.has(remotePeerId)) return;
    // Guard: never call yourself
    if (remotePeerId === peerRef.current.id) return;
```

### Zmiana B: Self-connection guard w `peer.on('call')` (po linii 1480)
```typescript
peer.on('call', async (call) => {
    if (cancelled) return;
    // Guard: reject self-calls
    if (call.peer === peerId) return;
```

### Zmiana C: Fix `.eq()` chaining w cleanup (linie 665, 691)
```typescript
// Linia 665:
if (cleanupPeerId) {
    await guestQ.eq('peer_id', cleanupPeerId);
} else {
    await guestQ;
}

// Linia 691:
if (cleanupPeerId) {
    await userQ.eq('peer_id', cleanupPeerId);
} else {
    await userQ;
}
```

### Zmiana D: Stabilna zależność init useEffect (linia 1655)
```typescript
}, [user?.id, roomId, guestMode, guestTokenId]);
```
Plus dodanie `userRef` do użycia wewnątrz init zamiast bezpośrednio `user` (wzorzec już stosowany w MeetingRoom.tsx).

4 punktowe zmiany w 1 pliku — łącznie ~20 linii.

