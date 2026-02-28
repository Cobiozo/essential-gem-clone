

## Udostepnianie ekranu: fullscreen + przeciagane PiP kamery prowadzacego

### Obecna architektura i ograniczenie

Aktualnie, gdy prowadzacy udostepnia ekran, jego track video z kamery jest **zastepowany** trackiem z ekranu (`replaceTrack`). Uczestnicy otrzymuja JEDEN stream na peera — albo kamere, albo ekran. Nie ma mozliwosci jednoczesnego wyswietlenia obu.

### Rozwiazanie: Drugi PeerJS call dla screen share

Aby uczestnicy widzieli jednoczesnie ekran (fullscreen) i kamere prowadzacego (PiP), potrzebny jest **drugi strumien**. Realizacja przez drugie polaczenie PeerJS z metadana `type: 'screen-share'`.

---

### Szczegolowe zmiany

#### Plik 1: `src/components/meeting/VideoRoom.tsx`

**A. Nowy state i ref dla screen share:**
- `screenShareConnectionsRef = useRef<Map<string, MediaConnection>>()` — oddzielna mapa polaczen screen share
- `remoteScreenShare` state: `{ peerId: string; displayName: string; stream: MediaStream } | null`

**B. Zmiana logiki startowania screen share (linia ~1556-1596):**
- NIE zastepowac camera track w glownym polaczeniu
- NIE zatrzymywac camera tracks
- Pobrac `getDisplayMedia` i wyslac jako DRUGIE call do kazdego peera:
  ```text
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  participants.forEach(p => {
    const call = peerRef.current.call(p.peerId, screenStream, {
      metadata: { displayName, type: 'screen-share', userId: user?.id }
    });
    screenShareConnectionsRef.current.set(p.peerId, call);
  });
  ```
- Broadcast `screen-share-started` z `peerId` i `displayName`
- `videoTrack.onended` → zamknac screen share connections + broadcast `screen-share-stopped`

**C. Zmiana `peer.on('call')` (linia ~1047):**
- Sprawdzic `call.metadata.type === 'screen-share'`
- Jesli tak: `call.answer()` z pustym streamem (lub local stream), zapisac stream do `remoteScreenShare` state
- NIE nadpisywac glownego polaczenia camera w `connectionsRef`

**D. Broadcast listener `screen-share-stopped`:**
- Dodac listener w signaling channel
- Po otrzymaniu: zamknac screen share connection, wyczyscic `remoteScreenShare`

**E. Zmiana `restoreCamera` / stop screen share:**
- Zamknac wszystkie screen share connections
- Broadcast `screen-share-stopped`
- Wyczyscic `screenShareConnectionsRef`
- Kamera juz dziala (nie byla zatrzymana)

**F. Przekazanie do VideoGrid:**
- Nowe propsy: `remoteScreenShareStream`, `remoteScreenSharerName`

#### Plik 2: `src/components/meeting/VideoGrid.tsx`

**A. Nowe propsy w `VideoGridProps`:**
```text
remoteScreenShareStream?: MediaStream | null;
remoteScreenSharerName?: string;
```

**B. Nowy komponent `DraggableFloatingPiP`:**
- Male okienko (200x150px) z kamera prowadzacego
- Przeciagane myszka i dotykiem (onMouseDown/onTouchStart + move + up)
- Pozycja absolutna wzgledem kontenera VideoGrid
- Zaokraglone rogi, cien, z-index nad glownym video
- Wyswietla imie prowadzacego na dole
- Domyslna pozycja: prawy dolny rog

**C. Nowy layout `ScreenShareLayout`:**
- Gdy `remoteScreenShareStream` istnieje, nadpisuje aktualny tryb widoku
- Screen share video na pelny ekran (object-contain, czarne tlo)
- Kamera prowadzacego w `DraggableFloatingPiP` (znaleziona po peerId w participants)
- Pasek miniaturek innych uczestnikow na dole (jak w speaker mode)

**D. Logika w glownym `VideoGrid`:**
```text
if (remoteScreenShareStream) {
  return <ScreenShareLayout ... />;
}
// ...istniejacy kod trybów speaker/gallery/multi-speaker
```

---

### Przepływ (perspektywa uczestnika)

```text
1. Prowadzacy klika "Udostepnij ekran"
2. getDisplayMedia → screenStream
3. Drugie peer.call() do kazdego uczestnika z metadata.type='screen-share'
4. Broadcast 'screen-share-started'
5. Uczestnik:
   - peer.on('call') → wykrywa type='screen-share' → answer → remoteScreenShare state
   - VideoGrid wykrywa remoteScreenShareStream → ScreenShareLayout
   - Ekran fullscreen + kamera prowadzacego w przeciaganym PiP
6. Prowadzacy konczy → zamyka screen share connections → broadcast 'screen-share-stopped'
7. Uczestnik: remoteScreenShare = null → powrot do normalnego trybu
```

---

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoRoom.tsx` | Dual-stream screen share, nowe broadcast events, oddzielne connections |
| `src/components/meeting/VideoGrid.tsx` | ScreenShareLayout, DraggableFloatingPiP, nowe propsy |

### Ryzyko

Srednie. Wymaga starannego zarzadzania dwoma zestawami polaczen PeerJS. Kluczowe edge cases:
- Nowy uczestnik dolacza podczas trwajacego screen share (trzeba mu rowniez wyslac screen stream)
- Prowadzacy traci polaczenie i reconnectuje
- Zamkniecie przegladarki podczas screen share (cleanup)

