

## Naprawa: duplikaty uczestnikow w siatce video

### Problem

Gdy uczestnik odswiezy strone lub ponownie dolaczy, dostaje NOWY `peerId` od PeerJS. Stary wpis w lokalnym stanie `participants` u innych uczestnikow nie jest natychmiast usuwany, poniewaz:

1. Zdarzenie `peer-left` nie jest wysylane przy zamknieciu karty / odswiezeniu (brak czystego zamkniecia)
2. Zdarzenie `close` na starym polaczeniu moze nie wypalic od razu
3. Mechanizm "ghost pruning" wymaga 3 kolejnych pudel z interwalu co kilka sekund
4. Tymczasem uzytkownik z nowym `peerId` nadaje `peer-joined` i jest ponownie wywolywany

Efekt: ten sam uzytkownik widnieje 2 razy w siatce — raz ze starym (martwym) peer ID, raz z nowym.

### Przyczyna w kodzie

W `handleCall` -> `call.on('stream')` (linia 1120):

```text
setParticipants((prev) => {
  const exists = prev.find((p) => p.peerId === call.peer);
  if (exists) return prev.map(p => p.peerId === call.peer ? {...p, stream} : p);
  return [...prev, { peerId: call.peer, displayName: name, stream, avatarUrl, userId }];
});
```

Deduplikacja odbywa sie TYLKO po `peerId`. Jesli ten sam uzytkownik polaczyl sie z nowym peer ID, stary wpis nie jest usuwany.

### Rozwiazanie

**Zmiana 1: Deduplikacja po `userId` w `handleCall` (VideoRoom.tsx)**

W `call.on('stream')` — przy dodawaniu nowego uczestnika, usunac stare wpisy tego samego `userId` (jesli istnieja) i zamknac ich martwe polaczenia:

```text
setParticipants((prev) => {
  const exists = prev.find((p) => p.peerId === call.peer);
  if (exists) return prev.map(p => p.peerId === call.peer ? {...p, stream: remoteStream} : p);
  
  // Deduplikacja po userId: usun stare wpisy tego samego uzytkownika z innym peerId
  let cleaned = prev;
  if (userId) {
    const oldEntries = prev.filter(p => p.userId === userId && p.peerId !== call.peer);
    oldEntries.forEach(old => {
      const oldConn = connectionsRef.current.get(old.peerId);
      if (oldConn) { try { oldConn.close(); } catch {} }
      connectionsRef.current.delete(old.peerId);
    });
    cleaned = prev.filter(p => !(p.userId === userId && p.peerId !== call.peer));
  }
  
  return [...cleaned, { peerId: call.peer, displayName: name, stream: remoteStream, avatarUrl, userId }];
});
```

**Zmiana 2: Deduplikacja po `userId` przy odbiorze `peer-joined` (VideoRoom.tsx)**

W handleru `peer-joined` (linia 849), przed wywolaniem `callPeer`, usunac stare wpisy tego samego userId:

```text
channel.on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
  if (payload.peerId !== peerId && !cancelled) {
    // Usun stary wpis tego samego uzytkownika (reconnect z nowym peerId)
    if (payload.userId) {
      setParticipants(prev => {
        const oldEntries = prev.filter(p => p.userId === payload.userId && p.peerId !== payload.peerId);
        oldEntries.forEach(old => {
          const oldConn = connectionsRef.current.get(old.peerId);
          if (oldConn) { try { oldConn.close(); } catch {} }
          connectionsRef.current.delete(old.peerId);
          reconnectingPeersRef.current.delete(old.peerId);
        });
        return prev.filter(p => !(p.userId === payload.userId && p.peerId !== payload.peerId));
      });
    }
    callPeer(payload.peerId, payload.displayName, stream, undefined, payload.userId);
  }
});
```

**Zmiana 3: Deduplikacja po `userId` przy odbiorze incoming call (VideoRoom.tsx)**

W `peer.on('call')` (linia 1015), po uzyskaniu `callerUserId`, usunac stare wpisy:

```text
// Po uzyskaniu callerUserId (linia ~1048):
if (callerUserId) {
  // Usun stare wpisy tego samego uzytkownika
  setParticipants(prev => {
    const oldEntries = prev.filter(p => p.userId === callerUserId && p.peerId !== call.peer);
    oldEntries.forEach(old => {
      const oldConn = connectionsRef.current.get(old.peerId);
      if (oldConn) { try { oldConn.close(); } catch {} }
      connectionsRef.current.delete(old.peerId);
      reconnectingPeersRef.current.delete(old.peerId);
    });
    return prev.filter(p => !(p.userId === callerUserId && p.peerId !== call.peer));
  });
}
```

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoRoom.tsx` | Deduplikacja po userId w 3 miejscach: handleCall stream, peer-joined, peer.on('call') |

### Ryzyko

Niskie. Zmiany sa defensywne — usuwaja duplikaty tylko gdy `userId` sie zgadza i `peerId` jest inny. Nie wplywa na gosci bez userId (ci maja `undefined`). Stare martwe polaczenia sa zamykane, co zwalnia zasoby WebRTC.
