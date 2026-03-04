

## Problem: Powrót na kartę resetuje mute — audio włącza się samo

### Przyczyna

W `VideoRoom.tsx` linia 931: `handleVisibilityChange` wywołuje `reacquireLocalStream()` **zawsze na mobile** (warunek `|| isMobile`), nawet gdy obecny strumień jest żywy. `reacquireLocalStream()` pobiera nowy strumień z `getUserMedia` z włączonym audio — i NIE sprawdza `isMutedRef.current` przed ustawieniem tracków. Nowy strumień ma `audioTrack.enabled = true` domyślnie, więc użytkownik zostaje "odmutowany" bez zgody.

Linia 931:
```
if (!stream || !tracksAlive || isMobile) {
```
Ten `|| isMobile` wymusza reacquire na każdym powrocie z innej karty na mobile, nawet gdy strumień jest OK.

### Plan naprawy

**Plik: `src/components/meeting/VideoRoom.tsx`**

1. **Visibility handler (linia 931)**: Usunąć `|| isMobile` z warunku. Reacquire powinno następować TYLKO gdy `!stream || !tracksAlive`, niezależnie od urządzenia.

2. **`reacquireLocalStream()` (po liniach 1700-1702)**: Po pozyskaniu nowego strumienia, natychmiast zastosować aktualny stan mute/camera:
   ```
   stream.getAudioTracks().forEach(t => t.enabled = !isMutedRef.current);
   stream.getVideoTracks().forEach(t => t.enabled = !isCameraOffRef.current);
   ```
   Dzięki temu nawet gdy reacquire jest potrzebne (martwy strumień), stan użytkownika jest zachowany.

3. **Dodać `isCameraOffRef`** (analogicznie do `isMutedRef`): ref śledzący aktualny stan kamery, aktualizowany w useEffect.

### Zakres zmian
- `src/components/meeting/VideoRoom.tsx` — ~10 linii zmian, 3 miejsca

