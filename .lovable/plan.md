

## Naprawa echa: "slyszę siebie" podczas udostepniania ekranu

### Przyczyna

Ostatnia poprawka audio dodala do `playVideoSafe` logike:
```
if (userHasInteracted) video.muted = false;
```

To **nadpisuje** celowe wyciszenie kafelkow wideo w trybach Speaker i Multi-Speaker. W tych trybach audio jest odtwarzane przez oddzielne ukryte elementy `<video>` (AudioElement), a kafelki sa celowo wyciszane dla poprawnego dzialania AEC (echo cancellation). Gdy `playVideoSafe` wymusza `muted=false`, audio gra zarowno z kafelka, jak i z AudioElement — co powoduje echo (uzytkownik slyszy siebie).

### Rozwiazanie

Zmienic `playVideoSafe` tak, aby **nie nadpisywalo** stanu `muted` ustawionego wczesniej przez komponent. Logika "sprobuj z dzwiekiem jesli uzytkownik juz kliknal" powinna dzialac **tylko** dla elementow, ktore nie zostaly celowo wyciszone.

### Zmiany

**Plik: `src/components/meeting/VideoGrid.tsx`**

1. **`playVideoSafe`** — nie ustawiac `video.muted = false` bezwarunkowo. Zamiast tego: jesli video jest juz `muted` (ustawione przez komponent, np. `video.muted = !playAudio`), nie zmieniac tego. Flaga `userHasInteracted` powinna wplywac tylko na elementy, ktore nie maja jawnego wyciszenia:

```
const playVideoSafe = async (
  video: HTMLVideoElement, 
  isLocal: boolean, 
  onAudioBlocked?: () => void
) => {
  if (isLocal) {
    video.play().catch(() => {});
    return;
  }
  // Respect the muted state already set by the component.
  // Only try unmuted play for elements that weren't explicitly muted.
  try {
    await video.play();
  } catch {
    video.muted = true;
    try {
      await video.play();
      console.warn('[VideoGrid] Autoplay blocked — playing muted');
      onAudioBlocked?.();
    } catch (e2) {
      console.error('[VideoGrid] Even muted play() failed:', e2);
    }
  }
};
```

2. **`AudioElement`** — analogicznie: usunac nadpisywanie `el.muted = false`. AudioElement i tak powinien grac z dzwiekiem (nie jest celowo wyciszany), wiec wystarczy nie ustawiac `muted = true` na start:

```
// Zamiast: if (userHasInteracted) el.muted = false;
// Po prostu: nie ustawiac muted na poczatku (domyslnie false)
el.play().catch(() => {
  el.muted = true;
  el.play().then(() => {
    onAudioBlocked?.();
  }).catch(() => {});
});
```

3. **`ScreenShareLayout`** — bez zmian. Video ekranu ma juz `muted={!shouldUnmute}` kontrolowane przez `isAudioUnlocked`/`userHasInteracted`, co jest poprawne (screen share nie jest czescia AEC pipeline).

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/VideoGrid.tsx` | Usunac nadpisywanie `muted` w `playVideoSafe` i `AudioElement` — respektowac stan ustawiony przez komponent |

### Ryzyko

Niskie. Przywracamy oryginalne zachowanie `playVideoSafe` z jednym ulepszeniem: screen share video nadal korzysta z dynamicznego `muted` (co jest poprawne). Kafelki w Speaker/Multi-Speaker beda znow poprawnie wyciszane, eliminujac echo.

