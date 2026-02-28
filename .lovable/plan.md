
## Naprawa: uczestnik dalej widoczny po rozlaczeniu

### Problem

Gdy uczestnik zamyka karte / odswiezy strone:
1. `beforeunload` poprawnie ustawia `is_active: false` w bazie (potwierdzone w danych)
2. ALE broadcast `peer-left` NIE jest wysylany — jest tylko w `cleanup()` (async), a `beforeunload` ma wlasna sciezke synchroniczna ktora go pomija
3. Heartbeat co 15s wymaga 3 pudel (45s minimum), a dodatkowo jesli stare polaczenie WebRTC raportuje stan `connected`, licznik jest resetowany — uczestnik moze nie zniknac przez minuty

### Rozwiazanie

**Zmiana 1: Broadcast `peer-left` w `beforeunload` (VideoRoom.tsx, linia ~428)**

Dodac probe wyslania broadcastu `peer-left` bezposrednio w `handleBeforeUnload`:

```text
const handleBeforeUnload = () => {
  // ... istniejacy kod ...
  
  // Broadcast peer-left synchronicznie (best-effort)
  const peerId = peerRef.current?.id;
  if (peerId && channelRef.current) {
    try {
      channelRef.current.send({ 
        type: 'broadcast', 
        event: 'peer-left', 
        payload: { peerId } 
      });
    } catch {}
  }
  
  // ... reszta istniejacego kodu (fetch z keepalive) ...
};
```

**Zmiana 2: Subskrypcja Realtime na `meeting_room_participants` (VideoRoom.tsx)**

Dodac nowy `useEffect` ktory subskrybuje zmiany w tabeli `meeting_room_participants` dla danego pokoju. Gdy uczestnik jest deaktywowany (`is_active: false`), natychmiast usunac go z lokalnego stanu:

```text
useEffect(() => {
  if (!roomId) return;
  
  const channel = supabase
    .channel(`participant-status-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'meeting_room_participants',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const updated = payload.new as any;
        if (updated.is_active === false && updated.peer_id) {
          // Nie usuwaj samego siebie
          const myPeerId = peerRef.current?.id;
          if (updated.peer_id !== myPeerId) {
            console.log('[VideoRoom] Participant deactivated via DB:', updated.peer_id);
            removePeer(updated.peer_id);
          }
        }
      }
    )
    .subscribe();
    
  return () => { supabase.removeChannel(channel); };
}, [roomId]);
```

**Zmiana 3: Skrocic czas ghost pruning w heartbeat (VideoRoom.tsx, linia ~533)**

Zmienic prog z 3 pudel na 2 pudla (30s zamiast 45s), i dodac dodatkowe sprawdzenie: jesli peer nie ma `stream` (null) i nie jest w trakcie reconnectu, usunac od razu:

```text
// W heartbeat, linia 533:
if (missCount >= 2) {  // bylo 3, teraz 2
  toRemove.push(p.peerId);
  ...
}
```

### Diagram dzialania

```text
Uczestnik zamyka karte:
  1. beforeunload -> broadcast peer-left (best-effort)
  2. beforeunload -> fetch PATCH is_active=false (keepalive)
  
Inni uczestnicy odbieraja:
  A) broadcast peer-left -> removePeer() natychmiast
  B) Realtime UPDATE is_active=false -> removePeer() w ~1s
  C) Heartbeat ghost pruning -> removePeer() w 30s (fallback)
  
Wczesniej dzialalo TYLKO C (45s minimum), teraz sa 3 warstwy.
```

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoRoom.tsx` | Broadcast peer-left w beforeunload |
| `src/components/meeting/VideoRoom.tsx` | Nowa subskrypcja Realtime na meeting_room_participants |
| `src/components/meeting/VideoRoom.tsx` | Skrocenie progu ghost pruning z 3 do 2 |

### Ryzyko

Niskie. Zmiana 1 jest best-effort (broadcast moze nie dojsc przy zamknieciu karty, ale nic nie psuje). Zmiana 2 dodaje redundancje — jesli Realtime nie dziala, heartbeat nadal posprzata. Zmiana 3 skraca czas oczekiwania ale zachowuje odpowiedni margines.
