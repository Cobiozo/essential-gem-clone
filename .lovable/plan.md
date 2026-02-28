

## Naprawa 3 problemow: echo, utrata audio/video po screen share, zmiana trybu

### Problem 1: Echo w trybie speaker/multi-speaker ("slychac siebie")

**Przyczyna**: React ma znany bug z atrybutem `muted` na elementach `<video>` — prop `muted={true}` nie zawsze jest aplikowany do DOM przy re-renderach. W `ThumbnailTile` i `MiniVideo`, `muted={!playAudio}` moze nie dzialac poprawnie, co sprawia ze miniaturka aktywnego mowcy (ktora powinna byc wyciszona) moze odtwarzac audio — prowadzac do podwojnego audio i echa.

W trybie galerii problem nie wystepuje, bo kazdy uczestnik ma dokladnie JEDEN element `<video>` (bez duplikatow).

**Rozwiazanie**: Dodac `useEffect` w `ThumbnailTile` i `MiniVideo`, ktory imperatywnie ustawia `video.muted` za kazdym razem gdy zmieni sie `playAudio`:

```text
// ThumbnailTile
useEffect(() => {
  if (videoRef.current) {
    videoRef.current.muted = !playAudio;
  }
}, [playAudio]);

// MiniVideo - analogicznie
useEffect(() => {
  if (ref.current) {
    ref.current.muted = !playAudio;
  }
}, [playAudio]);
```

Dodatkowo w istniejacym useEffect (ustawianie srcObject), po `playVideoSafe` dodac jawne `video.muted = !playAudio` aby stan poczatkowy tez byl poprawny.

---

### Problem 2: Uczestnicy traca audio/video prowadzacego po zakonczeniu udostepniania ekranu

**Przyczyna**: W handlerze `screen-share-stopped` na stronie uczestnika (linia 969-970), kod jawnie zamyka polaczenia screen share:
```text
screenShareConnectionsRef.current.forEach((conn) => { try { conn.close(); } catch {} });
```
PeerJS moze miec problem z wieloma polaczeniami do tego samego peera — zamkniecie jednego polaczenia (screen share) moze zaktywowac cleanup wewnetrzny, ktory zaklocaja glowne polaczenie kamerowe do tego samego peera. Efekt: uczestnik traci stream prowadzacego.

**Rozwiazanie**: Usunac jawne `conn.close()` z handlera `screen-share-stopped` po stronie uczestnika. Wystarczy wyczyscic stan UI (`setRemoteScreenShare(null)`) i mape referencji. Polaczenia zamkna sie automatycznie gdy prowadzacy zamknie je ze swojej strony (w `stopScreenShare`).

Zmiana w `VideoRoom.tsx` (linia 964-971):
```text
channel.on('broadcast', { event: 'screen-share-stopped' }, ({ payload }) => {
  if (!cancelled) {
    console.log('[VideoRoom] Screen share stopped by', payload?.peerId);
    setRemoteScreenShare(null);
    // Don't close connections explicitly - let host close them
    // to avoid PeerJS interference with main camera connections
    screenShareConnectionsRef.current.clear();
  }
});
```

---

### Problem 3: Przelaczenie trybu widoku po zakonczeniu screen share

**Przyczyna**: ViewMode jest juz zapisywany w sessionStorage (poprzednia poprawka). Problem moze wynikac z tego, ze utrata polaczenia (Problem 2) powoduje reconnect lub remount komponentu. Jesli komponent sie remountuje, viewMode jest odczytywany z sessionStorage — co powinno dzialac. Ale jesli reconnect zmienia stan `participants` (np. tymczasowe usuniecie i ponowne dodanie prowadzacego), to aktywny mowca sie resetuje i uzytkownik moze odczuc to jako zmiane trybu.

**Rozwiazanie**: Naprawienie Problemu 2 powinno rozwiazac rowniez ten problem, poniewaz glowne polaczenie kamerowe nie bedzie juz zaklocane. Dodatkowa nie sa potrzebne zmiany.

---

### Bonus: Usuniecie martwego kodu

Komponent `AudioOnlyStreams` (linia 99-108) i prop `forceAudioMuted` w `VideoTile` nie sa juz nigdzie uzywane. Warto je usunac dla czytelnosci.

Rowniez funkcja `restoreCamera` (linia 1388-1467) jest zdefiniowana ale nigdy nie wywolywana — moze byc usunieta.

---

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | Imperatywne ustawianie `video.muted` w ThumbnailTile i MiniVideo. Usuniecie martwego kodu (AudioOnlyStreams, forceAudioMuted). |
| `src/components/meeting/VideoRoom.tsx` | Usuniecie `conn.close()` z handlera `screen-share-stopped`. Usuniecie martwej funkcji `restoreCamera`. |

### Ryzyko

Niskie. Zmiany sa defensywne:
- Imperatywne muted to dodatkowe zabezpieczenie (nie zastepuje JSX prop)
- Usuniecie `conn.close()` zmniejsza ryzyko kolizji PeerJS
- Usuwanie martwego kodu nie wplywa na dzialanie

