

## Naprawa: PiP pokazuje lokalne video + efekty tla nie dzialaja na desktop

### Problem 1: PiP pokazuje "mnie" zamiast uczestnika

**Przyczyna:** W `GalleryLayout` (VideoGrid.tsx linia 391), `onActiveVideoRef` jest przekazywane ZAWSZE do uczestnika `i === 0`. Ale `allParticipants[0]` to ZAWSZE uczestnik lokalny (linia 506-508: local jest wstawiany jako pierwszy). Wiec `activeVideoRef` wskazuje na lokalne video.

Logika fallbacku w `handleTogglePiP` (linia 1437-1443) probuje znalezc zdalne video przez `querySelectorAll`, ale filtr wymaga `videoWidth > 0 && !v.paused` -- zdalne video moze jeszcze nie byc w pełni załadowane.

Dodatkowo, auto-PiP (linia 1470) uzywa `participants.length` zamknietego w stale closure (useEffect zalezy tylko od `[isPiPSupported]`), wiec `hasRemote` moze byc `false` mimo obecnosci uczestnikow.

**Naprawa w VideoGrid.tsx** - `GalleryLayout`: Przekazac `onActiveVideoRef` do pierwszego ZDALNEGO uczestnika zamiast zawsze do `i === 0`:

```text
// PRZED (linia 391):
videoRefCallback={i === 0 ? onActiveVideoRef : undefined}

// PO:
videoRefCallback={
  i === participants.findIndex(p => !p.isLocal) 
    ? onActiveVideoRef 
    : (i === 0 && !participants.some(p => !p.isLocal) ? onActiveVideoRef : undefined)
}
```

Analogicznie w `MultiSpeakerLayout` (linia 434).

**Naprawa w VideoRoom.tsx** - participantsCountRef + zamykanie PiP:

1. Dodac ref synchronizowany z `participants.length`:
```text
const participantsCountRef = useRef(participants.length);
participantsCountRef.current = participants.length;
```

2. W `handleVisibility` (linia 1470) zamienic `participants.length` na `participantsCountRef.current`

3. Zamykac PiP przy powrocie na karte BEZ warunku `autoPiPRef.current` (linia 1499):
```text
// PRZED:
if (document.pictureInPictureElement && autoPiPRef.current) {
// PO:
if (document.pictureInPictureElement) {
```

### Problem 2: Efekty rozmycia/tla nie dzialaja na desktop

**Przyczyna:** Dwie brakujace kontrole `isTabHidden` w `processFrame` powoduja, ze w trybie tla (PiP) rAF jest wywolywane rownoczesnie z setInterval, co tworzy podwojny loop i moze powodowac bledy segmentatora (podwojne wywolania z tymi samymi timestampami). Po kilkudziesieciu bledach system wchodzi w pass-through i efekt znika.

Linia 254 (wczesne wyjscie gdy videoWidth=0):
```text
this.animationFrameId = requestAnimationFrame(this.processFrame);
// Brak sprawdzenia isTabHidden!
```

Linia 269 (pass-through recovery):
```text
this.animationFrameId = requestAnimationFrame(this.processFrame);
// Brak sprawdzenia isTabHidden!
```

**Naprawa w VideoBackgroundProcessor.ts** - dodac kontrole `isTabHidden` we WSZYSTKICH sciezkach wyjscia `processFrame`:

```text
// Linia 254 - early return gdy video nie gotowe:
if (!this.isTabHidden) {
  this.animationFrameId = requestAnimationFrame(this.processFrame);
}
return;

// Linia 269 - pass-through mode:
if (!this.isTabHidden) {
  this.animationFrameId = requestAnimationFrame(this.processFrame);
}
return;
```

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `VideoGrid.tsx` | GalleryLayout/MultiSpeakerLayout: activeVideoRef na pierwszego zdalnego uczestnika |
| `VideoRoom.tsx` | Nowy `participantsCountRef`; uzycie w handleVisibility; usuniecie warunku `autoPiPRef` przy zamykaniu PiP |
| `VideoBackgroundProcessor.ts` | Dodanie kontroli `isTabHidden` w dwoch brakujacych sciezkach processFrame |

