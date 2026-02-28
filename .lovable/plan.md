

## Naprawa: Uczestnicy nie slysza sie nawzajem

### Przyczyna

W `VideoRoom.tsx`, handler `peer.on('call')` (linia 979-1021) odpowiada na przychodzace polaczenia uzywajac zmiennej `stream` z domkniecia (closure) funkcji `init()`. Ta zmienna wskazuje na strumien MediaStream utworzony przy pierwszym wejsciu do pokoju.

Problem: gdy strumien lokalny zostanie zastapiony (np. przelaczenie kamery, reacquireLocalStream po powrocie z tla, visibilitychange), zmienna `stream` w closure nadal wskazuje na STARY, potencjalnie martwy strumien. Nowe przychodzace polaczenia sa wiec odpowiadane martwym strumieniem -- drugi uczestnik nie slysza i nie widzi nic.

To samo dotyczy `callPeer` wywolywanego z closure (linia 973) -- przekazuje stary `stream` zamiast aktualnego.

### Rozwiazanie

**Plik: `src/components/meeting/VideoRoom.tsx`**

1. **`peer.on('call')` handler (linia 1019)**: Zmienic `call.answer(stream)` na `call.answer(localStreamRef.current || stream)`. Dzieki temu zawsze odpowiadamy aktualnym strumieniem z refa, a oryginalny `stream` jest jedynie fallbackiem.

2. **Subskrypcja Realtime INSERT (linia 973)**: Zmienic `callPeer(...)` aby uzywalo `localStreamRef.current || stream` zamiast `stream` z closure.

3. **`callPeer` (linia 1061-1067)**: Zmienic aby domyslnie uzywalo `localStreamRef.current` gdy nie przekazano strumienia jawnie. Zmiana sygnatury lub uzycie refa wewnatrz.

### Szczegoly techniczne

```text
// Linia 1019 - zmiana:
call.answer(localStreamRef.current || stream);

// Linia 973 - zmiana:
callPeer(p.peer_id, p.display_name || 'Uczestnik', localStreamRef.current || stream, avatarUrl, p.user_id || undefined);

// callPeer (linia 1061-1067) - zmiana:
const callPeer = useCallback((remotePeerId: string, name: string, stream: MediaStream, avatarUrl?: string, userId?: string) => {
  if (!peerRef.current || connectionsRef.current.has(remotePeerId)) return;
  const activeStream = localStreamRef.current || stream;
  const call = peerRef.current.call(remotePeerId, activeStream, {
    metadata: { displayName, userId: user?.id, avatarUrl: localAvatarUrlRef.current },
  });
  if (call) handleCall(call, name, avatarUrl, userId);
}, [displayName, user?.id]);
```

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoRoom.tsx` | 3 miejsca: answer(), callPeer wewnatrz init, callPeer callback -- uzycie localStreamRef.current zamiast starego stream z closure |

### Dlaczego to naprawi problem

Kazde polaczenie PeerJS (przychodzace i wychodzace) bedzie uzywac aktualnego, zywego strumienia z `localStreamRef.current`. Nie ma znaczenia czy strumien byl wymieniony po wejsciu do pokoju -- ref zawsze wskazuje na najnowsza wersje.

