

## Naprawa 4 problemow WebRTC: widma, utrata obrazu, ekran i PiP

### Problem 1: Widma uczestnikow (ghost participants)
**Przyczyna**: `reconnectToPeer` uzywa `useCallback` z zaleznoscia `participants`, ale `participants` state jest staly (stale closure). Gdy ICE reconnect nastepuje, `participants.find(p => p.peerId === peerId)` na linii 766 moze nie znalezc uczestnika bo state jest nieaktualny. Rowniez brak periodycznego czyszczenia widm z lokalnej listy -- heartbeat aktualizuje DB ale nie usuwa starych uczestnikow z `participants` state.

**Rozwiazanie**:
- Zamienic `participants` w `reconnectToPeer` na `participantsRef` (nowy ref synchronizowany z state)
- Dodac periodyczna synchronizacje co 30s (razem z heartbeat): pobierac aktywnych uczestnikow z DB i usuwac z lokalnej listy tych ktorzy nie sa w DB

### Problem 2: Utrata obrazu/dzwieku drugiej osoby
**Przyczyna**: Ten sam problem stale closure. Gdy `reconnectToPeer` probuje ponownie polaczyc, `callPeer` uzywa starych danych uczestnika (lub nie znajduje go wcale). Takze po ICE reconnect, nowy stream moze nie byc poprawnie ustawiony w `participants` state bo `handleCall` dodaje nowego uczestnika zamiast aktualizowac istniejacego.

**Rozwiazanie**:
- Uzyc `participantsRef` w `reconnectToPeer` aby zawsze miec aktualne dane
- W `handleCall` -> `call.on('stream')`: zawsze aktualizowac stream istniejacego uczestnika (juz jest na linii 701, ale upewnic sie ze nie duplicates)
- Dodac `stream` track event listeners zeby wykryc gdy remote track sie konczy i zasygnalizowac reconnect

### Problem 3: Ekran udostepniania nie zamyka sie automatycznie
**Przyczyna**: Linia 851 `videoTrack.onended = () => { handleToggleScreenShare(); }` -- `handleToggleScreenShare` jest zdefiniowana jako zwykla funkcja (nie `useCallback`), wiec `onended` callback przechowuje stale referencje do `isScreenSharing`, `isMuted`, `localStreamRef` z momentu ustawienia handlera. Gdy uzytkownik klika "Stop sharing" w przegladarce, `onended` wywoluje stara wersje `handleToggleScreenShare` gdzie `isScreenSharing` moze byc `false` zamiast `true`.

**Rozwiazanie**:
- Uzyc ref `isScreenSharingRef` synchronizowany z `isScreenSharing` state
- W `onended` callback: sprawdzac `isScreenSharingRef.current` zamiast closure state
- Wydzielic logike powrotu do kamery do osobnej funkcji `restoreCamera()` wywolywanej bezposrednio z `onended`

### Problem 4: Brak auto-PiP przy udostepnianiu ekranu na desktop
**Przyczyna**: PiP uruchamia sie tylko na `visibilitychange` (zmiana karty). Nie ma logiki ktora automatycznie wlacza PiP gdy uzytkownik zaczyna udostepniac ekran na desktop -- co jest naturalne zachowanie (uzytkownik widzi udostepniany ekran, a PiP pokazuje uczestnikow).

**Rozwiazanie**:
- Po rozpoczeciu screen share na desktop: automatycznie uruchomic PiP z video elementem pierwszego zdalnego uczestnika
- Dodac warunek: tylko jesli `isPiPSupported` i jest przynajmniej 1 zdalny uczestnik
- Przy zakonczeniu screen share: automatycznie zamknac PiP

---

### Szczegoly techniczne

**Plik: `src/components/meeting/VideoRoom.tsx`**

#### Zmiana A: Dodac `participantsRef` (nowy ref)
```typescript
const participantsRef = useRef<RemoteParticipant[]>([]);
// Sync ref z state:
useEffect(() => { participantsRef.current = participants; }, [participants]);
```

#### Zmiana B: Naprawic `reconnectToPeer` -- uzyc ref zamiast state
Linia 766: zamienic `participants.find(...)` na `participantsRef.current.find(...)` i usunac `participants` z dependencies `useCallback`.

#### Zmiana C: Dodac `isScreenSharingRef` i naprawic `onended`
```typescript
const isScreenSharingRef = useRef(false);
useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);
```
W `handleToggleScreenShare` linia 851: zamienic `onended` na:
```typescript
videoTrack.onended = () => {
  if (isScreenSharingRef.current) {
    restoreCamera();
  }
};
```
Wydzielic `restoreCamera()` jako osobna funkcje ktora zawsze pobiera aktualne wartosci z refs.

#### Zmiana D: Auto-PiP przy screen share
Po linii 845 (`setIsScreenSharing(true)`): dodac logike auto-PiP:
```typescript
// Auto-PiP on desktop when screen sharing starts
if (isPiPSupported && participants.length > 0) {
  setTimeout(async () => {
    const videos = document.querySelectorAll('video');
    const remoteVideo = Array.from(videos).find(
      v => v.srcObject && v.videoWidth > 0 && !v.muted
    );
    if (remoteVideo && !document.pictureInPictureElement) {
      try {
        await remoteVideo.requestPictureInPicture();
        setIsPiPActive(true);
      } catch {}
    }
  }, 500);
}
```
W `restoreCamera()`: zamknac PiP jesli jest aktywny.

#### Zmiana E: Periodyczne czyszczenie widm z lokalnej listy
Rozszerzyc istniejacy heartbeat (linia 340-358) o synchronizacje:
Co 30s rownoczesnie z heartbeat: pobrac aktywnych z DB, porownac z lokalna lista, usunac widma z `participants` state i zamknac ich connections.

### Pliki do modyfikacji
- `src/components/meeting/VideoRoom.tsx` -- wszystkie zmiany A-E

### Wplyw
- Widma beda automatycznie usuwane co 30s
- Reconnect po ICE failure zawsze uzywa aktualnych danych uczestnikow
- Zakonczenie screen share (przycisk przegladarki) poprawnie wraca do kamery
- PiP uruchamia sie automatycznie przy udostepnianiu ekranu na desktop
