

## Diagnoza: Brak obrazu i problemy z dołączeniem (regresja po naprawach background)

### Zidentyfikowane przyczyny

Po analizie kodu widzę 3 problemy wprowadzone przez ostatnie zmiany:

**1. Lobby auto-apply saved background na mobile niszczy strumień**
- `MeetingLobby` linia 122-130: `useEffect` auto-wywołuje `applyBackground()` na starcie
- Po naszych zmianach, `applyBackground` na mobile/PWA wykonuje 3-etapowy retry, który niszczy (`destroy()`) i odtwarza procesor
- Każdy `attemptApply` wywołuje `processor.stop()` co ustawia `videoElement.srcObject = null` i `outputStream = null`
- Jeśli wszystkie 3 etapy zawiodą, `rawStreamRef` jest OK ale `processedStream` w lobby jest stale (stary reference)
- **Rezultat**: Lobby przekazuje martwy `processedStream` do VideoRoom w `handleJoin` (linia 243)

**2. VideoRoom freeze detection wywołuje `reacquireLocalStream` bez gestu użytkownika**
- Linia 153-210: `requestVideoFrameCallback` + stall handler wyzwalają `reacquireLocalStream()`
- Na iOS/PWA `getUserMedia` bez bezpośredniego gestu użytkownika może być zablokowane
- Skutkuje to pętlą: freeze → reacquire fails → no stream → freeze again

**3. Lobby przekazuje dead stream do VideoRoom**
- `handleJoin` (linia 243): `processedStream || previewStream`
- Jeśli background apply fail zostawił `processedStream` jako stale reference (nie null, ale z martwymi trackami), VideoRoom dostaje martwy strumień
- VideoRoom sprawdza `initialStream?.getTracks().some(t => t.readyState === 'live')` (linia 984) ale jeśli false, wywołuje `getUserMedia` w `useEffect` (bez gestu użytkownika na mobile)

### Plan naprawy

**1. MeetingLobby: Nie auto-apply background na mobile/PWA**
- W `useEffect` linia 122-130: wykrywać mobile/PWA i pominąć auto-apply saved background
- Zamiast tego: pokazać hint "Dotknij, aby włączyć efekt tła" (zachowane w localStorage)
- Na desktop: zachować dotychczasowe auto-apply

**2. MeetingLobby: handleJoin — walidacja strumienia przed przekazaniem**
- W `handleJoin` (linia 241-244): sprawdzić czy `processedStream` ma żywe tracki
- Jeśli nie — fallback do `previewStream` (raw camera)
- Jeśli i `previewStream` jest martwy — przekazać `undefined` (VideoRoom sam pobierze)

**3. VideoRoom: Bezpieczny freeze detection na mobile**  
- W `useEffect` freeze detection (linia 153-210): na mobile/PWA nie wywoływać `reacquireLocalStream()` automatycznie
- Zamiast tego: wyświetlić toast z przyciskiem "Włącz kamerę ponownie" (wymaga gestu)
- Stall handler: ten sam wzorzec — na mobile toast zamiast auto-reacquire

**4. VideoRoom: Lepsza walidacja initialStream**
- Linia 984-1015: jeśli `initialStream` jest present ale tracki martwe, traktować jak brak streamu
- Używać `initialStream` TYLKO jeśli ma `live` tracki
- Na mobile: jeśli getUserMedia w init fail (bo brak gestu), NIE blokować dołączenia — pozwolić dołączyć bez kamery i dać toast z hint do ręcznego włączenia

### Pliki do modyfikacji
- `src/components/meeting/MeetingLobby.tsx` — walidacja w handleJoin, skip auto-apply na mobile
- `src/components/meeting/VideoRoom.tsx` — bezpieczny freeze detection, lepsza obsługa initialStream

~40 linii zmian, brak nowych plików.

