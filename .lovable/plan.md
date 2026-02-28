
## Naprawa dwoch problemow: echo w trybie speaker/multi-speaker + przelaczenie viewMode po zakonczeniu screen share

### Problem 1: Echo w trybie speaker/multi-speaker

**Przyczyna**: W trybie galerii kazdy `VideoTile` odtwarza audio bezposrednio z widocznego elementu `<video>` — AEC przegladarki dziala poprawnie. W trybach speaker/multi-speaker audio jest odtwarzane z UKRYTYCH elementow `<video>` (komponent `AudioElement`), natomiast widoczne kafelki maja `forceAudioMuted={true}`. AEC Chrome dziala gorzej dla ukrytych elementow, co powoduje echo.

**Rozwiazanie**: Wyeliminowac `AudioOnlyStreams` i `forceAudioMuted`. Zamiast tego audio bedzie odtwarzane bezposrednio z widocznych elementow `<video>`:

- **Tryb speaker**: Usunac `AudioOnlyStreams`. Usunac `forceAudioMuted` z glownego `VideoTile`. W `ThumbnailTile` dodac prop `playAudio` — odmuteowac miniaturki dla zdalnych uczestnikow POZA aktywnym mowca (unikniecie podwojnego audio). Aktywny mowca gra audio z glownego kafelka, reszta z miniaturek.
- **Tryb multi-speaker**: Usunac `AudioOnlyStreams`. Usunac `forceAudioMuted` z glownych kafelkow. W sekcji "others" (MiniVideo) odmutowac zdalnych uczestnikow.

### Problem 2: Przelaczenie z galerii na mowce po zakonczeniu screen share

**Przyczyna**: `viewMode` domyslnie wynosi `'speaker'` (linia 93 VideoRoom.tsx) i NIE jest zapisywany w sessionStorage. Jesli cos spowoduje ponowne zamontowanie komponentu VideoRoom (np. zmiana stanu auth, reconnect kanalu realtime, lub inna zmiana statusu w MeetingRoomPage), viewMode wraca do domyslnego `'speaker'`.

**Rozwiazanie**: Zapisywac `viewMode` w `sessionStorage` przy kazdej zmianie i odtwarzac go w lazy initializer `useState`.

---

### Szczegolowe zmiany

**Plik 1: `src/components/meeting/VideoGrid.tsx`**

1. **ThumbnailTile** — dodac prop `playAudio?: boolean`:
   - Jesli `playAudio` jest true, video element ma `muted={false}` zamiast zawsze `muted`
   - Domyslnie `muted` (bez zmiany dla galerii i innych uzyc)

2. **MiniVideo** — dodac prop `playAudio?: boolean`:
   - Analogicznie, jesli true, video element ma `muted={false}`

3. **Speaker mode layout** (linia 620-652):
   - Usunac `<AudioOnlyStreams>` 
   - Usunac `forceAudioMuted={true}` z glownego VideoTile
   - W ThumbnailTile: ustawic `playAudio={!p.isLocal && index !== activeIndex}` — odmutowac zdalne miniaturki poza aktywnym mowca

4. **Multi-speaker mode layout** (linia 484-519):
   - Usunac `<AudioOnlyStreams>`
   - Usunac `forceAudioMuted={true}` z glownych VideoTile
   - W sekcji "others": ustawic `playAudio={!p.isLocal}` na MiniVideo

**Plik 2: `src/components/meeting/VideoRoom.tsx`**

1. **Persist viewMode** — zmienic useState na lazy initializer:
   ```text
   const [viewMode, setViewMode] = useState<ViewMode>(() => {
     if (roomId) {
       const saved = sessionStorage.getItem(`meeting_viewmode_${roomId}`);
       if (saved === 'gallery' || saved === 'multi-speaker' || saved === 'speaker') return saved;
     }
     return 'speaker';
   });
   ```

2. **Sync viewMode to sessionStorage** — dodac useEffect:
   ```text
   useEffect(() => {
     if (roomId) sessionStorage.setItem(`meeting_viewmode_${roomId}`, viewMode);
   }, [roomId, viewMode]);
   ```

3. **Cleanup** — w `handleLeave` dodac usuwanie klucza:
   ```text
   sessionStorage.removeItem(`meeting_viewmode_${roomId}`);
   ```

---

### Jak to dziala po zmianach

```text
Echo (speaker mode):
  PRZED: Audio z ukrytych <video> (AudioElement) → slabe AEC → echo
  PO:    Audio z widocznych <video> (glowny kafelek + miniaturki) → dobre AEC → brak echa

ViewMode:
  PRZED: viewMode = 'speaker' (domyslne), nie zapisywany → reset po remount
  PO:    viewMode zapisany w sessionStorage → przetrwa remount
```

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | Usunac AudioOnlyStreams i forceAudioMuted z speaker/multi-speaker. Dodac playAudio do ThumbnailTile i MiniVideo |
| `src/components/meeting/VideoRoom.tsx` | Persist viewMode w sessionStorage |

### Ryzyko

Niskie. Wszystkie audio teraz gra z widocznych elementow — identycznie jak w trybie galerii, ktory dziala bez echa. Zapis viewMode to standardowy wzorzec bez efektow ubocznych.
