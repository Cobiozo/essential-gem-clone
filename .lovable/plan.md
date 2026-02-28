

## Naprawa dwoch problemow: echo w speaker/multi-speaker + powrot do lobby po odswiezeniu

### Problem 1: Echo w trybie speaker/multi-speaker

**Przyczyna**: Komponent `AudioElement` uzywa elementu `<audio>` do odtwarzania dzwieku zdalnych uczestnikow. Przegladarki (szczegolnie Chrome) maja slabsze wsparcie AEC (echo cancellation) dla elementow `<audio>` niz `<video>`. W trybie galerii dzwiek gra przez elementy `<video>` i AEC dziala poprawnie — stad brak echa w galerii.

**Rozwiazanie**: Zamienic element `<audio>` na ukryty `<video>` w komponencie `AudioElement`. Przegladarki lepiej obsluguja AEC dla `<video>`, nawet gdy element jest ukryty.

### Problem 2: Odswiezenie wraca do lobby

**Przyczyna**: Mechanizm `tryAutoRejoin` jest wolany wewnatrz asynchronicznej funkcji `verifyAccess`, ktora zalezy od `user?.id` w dependency array useEffect. Jezeli obiekt `user` zmieni sie podczas inicjalizacji auth (np. token refresh), efekt moze sie uruchomic wielokrotnie lub w nieoczekiwanej kolejnosci. Ponadto guard `statusRef.current !== 'loading'` moze zablokowac ponowne uruchomienie po bledzie.

**Rozwiazanie**: Uzyc lazy initializer w `useState` aby synchronicznie sprawdzic `sessionStorage` PRZED jakimkolwiek efektem. Jezeli istnieja dane sesji, ustawic `status='joined'` od pierwszego renderowania — bez czekania na async verifyAccess.

---

### Zmiany w plikach

**Plik 1: `src/components/meeting/VideoGrid.tsx`**

Zmiana w komponencie `AudioElement` (linia 79-94):

Zamienic `<audio>` na ukryty `<video>`:
- `useRef<HTMLAudioElement>` → `useRef<HTMLVideoElement>`
- Element `<audio ref={ref} autoPlay />` → `<video ref={ref} autoPlay playsInline style={{ display: 'none' }} />`
- Dodac `playsInline` dla kompatybilnosci z iOS

**Plik 2: `src/pages/MeetingRoom.tsx`**

Zmiana 1: Lazy initializer dla `status` (linia 33):

Zamiast:
```text
const [status, setStatus] = useState<...>('loading');
```

Uzyc:
```text
const [status, setStatus] = useState<...>(() => {
  // Synchroniczne sprawdzenie sessionStorage na auto-rejoin
  if (roomId && !isGuestMode) {
    const raw = sessionStorage.getItem(`meeting_session_${roomId}`);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (Date.now() - saved.joinedAt <= 4 * 60 * 60 * 1000) {
          return 'joined';
        }
      } catch {}
    }
  }
  return 'loading';
});
```

Zmiana 2: Rowniez odtworzyc `audioEnabled`, `videoEnabled`, `initialSettings` z sessionStorage synchronicznie (linie 36-42):

Uzyc lazy initializers dla tych stanow, czytajac dane z tego samego klucza `meeting_session_${roomId}`.

Zmiana 3: W efekcie `verifyAccess` (linia 116), zmienic guard aby pozwolic na ponowna weryfikacje z 'joined' (na wypadek cofniecia dostepu):

```text
if (statusRef.current !== 'loading' && statusRef.current !== 'joined') return;
```

I dodac w verifyAccess sprawdzenie: jesli juz jestesmy 'joined' (z auto-rejoin), nie nadpisywac statusu na 'lobby' — tylko na bledy ('error', 'unauthorized').

---

### Diagram dzialania po zmianach

```text
Odswiezenie strony:
  1. useState(() => ...) synchronicznie sprawdza sessionStorage
  2. Jesli dane istnieja -> status = 'joined' od razu (VideoRoom renderuje sie natychmiast)
  3. verifyAccess biegnie w tle i waliduje dostep
  4. Jesli dostep cofniety -> status zmienia sie na 'unauthorized'
  
Echo:
  PRZED: <audio> element -> slabe AEC -> echo
  PO:    <video hidden> element -> dobre AEC -> brak echa
```

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | AudioElement: zamiana `<audio>` na ukryty `<video>` |
| `src/pages/MeetingRoom.tsx` | Lazy initializer dla status + audioEnabled/videoEnabled/settings |
| `src/pages/MeetingRoom.tsx` | Guard w verifyAccess: pozwolic na re-weryfikacje z 'joined' |

### Ryzyko

Niskie. Ukryty `<video>` zachowuje sie identycznie jak `<audio>` pod wzgledem odtwarzania, ale z lepszym AEC. Lazy initializer jest standardowym wzorcem React i nie wplywa na inne efekty.

