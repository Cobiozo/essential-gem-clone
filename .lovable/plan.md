

## Naprawa: Uczestnicy nie widzą i nie słyszą siebie nawzajem

### Zidentyfikowane przyczyny

**Przyczyna 1: Lobby zabija strumień mimo przekazania do VideoRoom**

W `MeetingLobby.tsx` (linia 63-65), useEffect cleanup nadal wywołuje `stream?.getTracks().forEach(t => t.stop())` przy odmontowaniu komponentu. Mimo że `handleJoin` przekazuje `previewStream` do VideoRoom, cleanup uruchamia się gdy lobby jest odmontowywane i niszczy ten sam obiekt MediaStream. VideoRoom otrzymuje martwy strumień, fallbackuje na `getUserMedia`, ale to nie gwarantuje sukcesu i powoduje opóźnienia.

**Przyczyna 2 (KRYTYCZNA): Wyścig połączeń PeerJS - podwójne callPeer**

Gdy użytkownik A dołącza, a B jest już w pokoju:
1. B otrzymuje INSERT z Postgres Realtime -> wywołuje `callPeer(A)` (outgoing B->A)
2. A pobiera listę uczestników z DB -> wywołuje `callPeer(B)` (outgoing A->B)  
3. A odpowiada na incoming call od B -> `handleCall` -> `connectionsRef.set(B.peerId, incomingCall)` **NADPISUJE** outgoing call A->B
4. Nadpisane outgoing call A->B w pewnym momencie generuje event `close`
5. `call.on('close')` wywołuje `removePeer(B.peerId)` -> **USUWA uczestnika B ze stanu i z connectionsRef**
6. Wynik: incoming connection jest zgubiona, peer jest usunięty z listy

To samo dzieje się w drugą stronę. Efekt: oba strony tracą połączenie z drugim uczestnikiem.

### Plan naprawy

#### 1. MeetingLobby - nie niszcz strumienia przy odmontowaniu
**Plik**: `src/components/meeting/MeetingLobby.tsx`

Dodac ref `streamPassedRef` ktory jest ustawiany na `true` w `handleJoin`. W useEffect cleanup, sprawdzic ref -- jesli stream byl przekazany, nie zatrzymywac go:

```text
const streamPassedRef = useRef(false);

const handleJoin = () => {
  streamPassedRef.current = true;  // stream przejety przez VideoRoom
  onJoin(audioEnabled, videoEnabled, ...);
};

// W useEffect cleanup:
return () => {
  if (!streamPassedRef.current) {
    stream?.getTracks().forEach((t) => t.stop());
  }
};
```

#### 2. handleCall - zabezpieczenie przed usunieciem peera przez nadpisane polaczenie
**Plik**: `src/components/meeting/VideoRoom.tsx`

W `handleCall` (linia 1052), zmiana eventow `close`, `error` i `timeout` tak, aby sprawdzaly czy dana instancja call jest nadal ta sama co w connectionsRef:

```text
const handleCall = (call: MediaConnection, name: string, avatarUrl?: string, userId?: string) => {
  connectionsRef.current.set(call.peer, call);
  
  const timeout = setTimeout(() => {
    // TYLKO jezeli to nadal ta sama instancja polaczenia
    if (connectionsRef.current.get(call.peer) !== call) return;
    connectionsRef.current.delete(call.peer);
  }, 15000);

  call.on('stream', (remoteStream) => { ... /* bez zmian */ });

  call.on('close', () => { 
    clearTimeout(timeout); 
    // Nie usuwaj peera jezeli polaczenie zostalo nadpisane nowszym
    if (connectionsRef.current.get(call.peer) === call) {
      removePeer(call.peer); 
    }
  });
  
  call.on('error', (err) => { 
    clearTimeout(timeout); 
    if (connectionsRef.current.get(call.peer) === call) {
      removePeer(call.peer);
    }
  });
  
  // ICE monitoring - bez zmian
};
```

#### 3. peer.on('call') - deduplikacja polaczen przychodzacych
**Plik**: `src/components/meeting/VideoRoom.tsx`

W `peer.on('call')` (linia 977), jezeli juz mamy aktywne polaczenie do tego peera z zywym ICE, nie odpowiadaj na drugie polaczenie:

```text
peer.on('call', async (call) => {
  if (cancelled) return;
  
  // Sprawdz czy juz mamy zywe polaczenie do tego peera
  const existingConn = connectionsRef.current.get(call.peer);
  if (existingConn) {
    const pc = (existingConn as any).peerConnection as RTCPeerConnection | undefined;
    const iceState = pc?.iceConnectionState;
    if (iceState === 'connected' || iceState === 'completed' || iceState === 'checking' || iceState === 'new') {
      // Polaczenie zyje lub jest w trakcie nawiazywania - ignoruj duplikat
      console.log(`[VideoRoom] Already have active connection to ${call.peer}, skipping incoming call`);
      return;
    }
    // Stare polaczenie jest martwe - zamknij i przyjmij nowe
    try { existingConn.close(); } catch {}
    connectionsRef.current.delete(call.peer);
  }
  
  // ... reszta handlera bez zmian (answer, handleCall) ...
});
```

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/MeetingLobby.tsx` | Ref `streamPassedRef` - nie zatrzymuj strumienia gdy przekazany do VideoRoom |
| `src/components/meeting/VideoRoom.tsx` | handleCall: zabezpieczenie close/error/timeout przed nadpisanym polaczeniem |
| `src/components/meeting/VideoRoom.tsx` | peer.on('call'): deduplikacja polaczen przychodzacych |

### Kryteria akceptacji

- Prowadzacy i uczestnik widza i slysza siebie nawzajem po dolaczeniu
- Nie wystepuje podwojne polaczenie PeerJS (brak race condition)
- Strumien z lobby jest prawidlowo przekazywany do VideoRoom (brak fallbacku na getUserMedia)
- Nadpisane polaczenia nie usuwaja aktywnych peerow ze stanu
