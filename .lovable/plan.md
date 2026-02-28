

## Naprawa: Sebastian Snopek pojawia sie i znika w webinarze

### Przyczyna glowna

W `reconnectToPeer` (linia 1178-1181) kolejnosc operacji jest bledna:

```text
// OBECNA KOLEJNOSC (bledna):
const oldConn = connectionsRef.current.get(peerId);
if (oldConn) { try { oldConn.close(); } catch {} }  // 1. Zamyka polaczenie
connectionsRef.current.delete(peerId);                // 2. Dopiero potem usuwa z mapy
```

Gdy `oldConn.close()` jest wywolane, PeerJS emituje zdarzenie `close` synchronicznie lub niemal natychmiast. Handler `close` (linia 1117-1121) sprawdza:

```text
call.on('close', () => {
  if (connectionsRef.current.get(call.peer) === call) {
    removePeer(call.peer);  // Usuwa uczestnika z UI!
  }
});
```

Poniewaz `connectionsRef.current.delete(peerId)` nastepuje PO `close()`, guard `connectionsRef.current.get(call.peer) === call` jest PRAWDZIWY i `removePeer` jest wywolywane -- uczestnik znika z UI.

Po 2 sekundach `callPeer` tworzy nowe polaczenie, stream dociera i uczestnik pojawia sie ponownie. Jesli siec jest niestabilna, ten cykl powtarza sie wielokrotnie:

```text
ICE disconnected/failed -> reconnectToPeer -> close() -> removePeer (ZNIKA)
  -> 2s delay -> callPeer -> stream -> addParticipant (POJAWIA SIE)
  -> ICE znow niestabilne -> reconnectToPeer -> ... (cykl)
```

### Dodatkowy problem: heartbeat pruning podczas reconnectu

Heartbeat co 15s sprawdza czy peer jest w DB i ma aktywne WebRTC. Podczas 2-sekundowego okna miedzy `close()` a nowym `callPeer`, nie ma zadnego polaczenia w `connectionsRef`. Jesli heartbeat trafi w to okno i peer nie jest w DB (np. jego heartbeat tez sie opoznil), miss counter rosnie -- po 3 misach uczestnik jest trwale usuwany.

### Rozwiazanie

**Zmiana 1: Odwrocic kolejnosc w `reconnectToPeer` (VideoRoom.tsx, linia 1178-1181)**

Usunac z mapy PRZED zamknieciem, aby handler `close` NIE wywolywal `removePeer`:

```text
// NOWA KOLEJNOSC:
const oldConn = connectionsRef.current.get(peerId);
connectionsRef.current.delete(peerId);                // 1. Najpierw usun z mapy
if (oldConn) { try { oldConn.close(); } catch {} }   // 2. Potem zamknij (handler close juz nie zadziala)
```

**Zmiana 2: Dodac set reconnectingPeersRef (VideoRoom.tsx)**

Nowy ref `reconnectingPeersRef = useRef<Set<string>>(new Set())` sledzacy peery w trakcie reconnektu. W `reconnectToPeer` dodac peerId do setu na poczatku i usunac po pomyslnym polaczeniu lub po 3 nieudanych probach.

**Zmiana 3: Nie usuwac uczestnika z UI podczas reconnektu**

W `removePeer` dodac guard: jesli peer jest w `reconnectingPeersRef`, nie usuwac z `participants` state (zachowac w UI z `stream: null`):

```text
const removePeer = (peerId: string) => {
  connectionsRef.current.delete(peerId);
  if (reconnectingPeersRef.current.has(peerId)) {
    // Peer w trakcie reconnektu - zachowaj w UI, wyczysc stream
    setParticipants(prev => prev.map(p => 
      p.peerId === peerId ? { ...p, stream: null } : p
    ));
    return;
  }
  setParticipants(prev => prev.filter(p => p.peerId !== peerId));
};
```

**Zmiana 4: Heartbeat nie pruninguje peerow w trakcie reconnektu**

W logice heartbeat pruning (linia 492-518), dodac sprawdzenie `reconnectingPeersRef`:

```text
if (reconnectingPeersRef.current.has(p.peerId)) {
  peerMissCountRef.current.delete(p.peerId);
  continue; // Nie licz miss-ow podczas reconnektu
}
```

**Zmiana 5: Czyszczenie reconnecting flagi po sukcesie/porazce**

W `handleCall` -> `call.on('stream')`: usunac peerId z `reconnectingPeersRef` (reconnekt sie udal).
W `reconnectToPeer` -> po 3 nieudanych probach: usunac z setu przed wywolaniem `removePeer`.

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `VideoRoom.tsx` | Odwrocic kolejnosc delete/close w reconnectToPeer |
| `VideoRoom.tsx` | Nowy ref `reconnectingPeersRef` |
| `VideoRoom.tsx` | removePeer: nie usuwac z UI podczas reconnektu (ustawic stream=null) |
| `VideoRoom.tsx` | Heartbeat: pomijac pruning dla reconnecting peers |
| `VideoRoom.tsx` | handleCall stream: czyscic reconnecting flage po sukcesie |

