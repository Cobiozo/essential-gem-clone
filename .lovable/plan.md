

# Audyt iOS: krytyczne bugi w odtwarzaniu wideo w Akademii

## Znalezione problemy

### BUG 1 (KRYTYCZNY): `forceHideBuffering` stale closure — iOS spinner fix nie działa

W `handleWaiting` (linia 737) jest warunek:
```typescript
if (isIOSDevice() && forceHideBuffering) { return; }
```
Ale `forceHideBuffering` to **stan React** przechwycony w momencie tworzenia efektu. useEffect (linia 1216) ma dependency array `[mediaType, disableInteraction, signedUrl, videoElement, retryCount]` — **bez `forceHideBuffering`**. Closure ZAWSZE widzi `false`. Cały iOS FIX D jest martwy — spinner dalej miga na każdym segmencie HLS.

**Fix**: Dodać `forceHideBufferingRef` (ref zsynchronizowany ze stanem) i używać ref w closures zamiast stanu.

### BUG 2 (KRYTYCZNY): Na iOS `lastValidTimeRef` nie awansuje przy dużych skokach

Tolerancja 15s w `handleTimeUpdate` może być niewystarczająca. Gdy iOS buforuje 20-30s przed pierwszym odtworzeniem, pierwszy `timeupdate` ma `timeDiff > 15` i `lastValidTimeRef` zostaje na 0. Kolejny `seeking` event resetuje wideo.

**Fix**: Na iOS, jeśli wideo nie jest pauzowane (`!video.paused`) i `timeDiff > 0`, ZAWSZE aktualizować `lastValidTimeRef`. Użytkownik nie ma slidera — nie może seekować do przodu.

### BUG 3: `isSeekingRef` blokada kumulacyjna

Każdy `handleSeeking` ustawia `isSeekingRef = true` na 500ms. iOS odpala seeking events co segment HLS. Jeśli seeking fires co 400ms, ref **nigdy nie wraca do false**, blokując WSZYSTKIE `handleTimeUpdate` callback (linia 1061: `if (isSeekingRef.current) return`). Postęp się nie liczy.

**Fix**: `handlePlaying` już czyści `isSeekingRef`, ale `handleTimeUpdate` powinien też czyścić ref jeśli wideo nie jest pauzowane i czas rośnie monotonicznie (dowód na normalny playback).

### BUG 4: Podwójne generowanie tokenów

Logi sieciowe pokazują 2x `generate-media-token` dla tego samego URL. Efekt URL (linia 317) i efekt resetu (linia 501) oba reagują na zmianę `mediaUrl`, powodując race condition.

**Fix**: Deduplikacja — dodać guard w efekcie URL żeby nie generować tokenu jeśli URL jest taki sam jak ostatnio przetworzony.

### BUG 5: Spinner overlay bez `pointer-events-none` na restricted mode

Linia 1891: overlay ładowania blokuje dotyk na wideo. W trybie restricted nie ma natywnych kontrolek, ale na iOS blokuje to gesture recognition i może zakłócać tap-to-resume.

**Fix**: Dodać `pointer-events-none` do overlay spinnera w restricted mode.

### BUG 6: `isTabHidden` stale w stuck detection

Linia 1605: `isTabHidden` pochodzi ze stanu, ale efekt stuck detection nie ma go w dependency array, więc widzi starą wartość. Może triggerować auto-recovery gdy karta jest ukryta.

**Fix**: Użyć `isTabHiddenRef.current` (ref już istnieje) zamiast stanu.

## Plan naprawy

### Plik: `src/components/SecureMedia.tsx`

**A) Dodać `forceHideBufferingRef`** — nowy ref synchronizowany ze stanem (wzorzec jak `isInitialBufferingRef`):
```typescript
const forceHideBufferingRef = useRef(false);
useEffect(() => { forceHideBufferingRef.current = forceHideBuffering; }, [forceHideBuffering]);
```
Zamienić `forceHideBuffering` na `forceHideBufferingRef.current` w closures handleWaiting (restricted i unrestricted).

**B) Naprawić `handleTimeUpdate` na iOS** — bezwarunkowa aktualizacja `lastValidTimeRef` gdy wideo gra:
```typescript
if (isIOSDevice() && !video.paused && timeDiff > 0) {
  lastValidTimeRef.current = video.currentTime;
} else if (timeDiff > 0 && (timeDiff <= tolerance || isBufferingRef.current)) {
  lastValidTimeRef.current = video.currentTime;
}
```

**C) Naprawić kumulację `isSeekingRef`** — w `handleTimeUpdate`, jeśli wideo gra i czas rośnie, wymusić reset:
```typescript
if (isSeekingRef.current && !video.paused && timeDiff > 0 && timeDiff < tolerance) {
  isSeekingRef.current = false; // Playback jest normalny, wyczyść flagę
}
```

**D) Deduplikacja tokenów** — w efekcie URL (linia 334), sprawdzić czy `mediaUrl` nie jest już przetwarzany (użyć ref `processingUrlRef`).

**E) Dodać `pointer-events-none`** do overlay spinnera w restricted mode (linia 1892).

**F) Naprawić stuck detection** — zamienić `isTabHidden` na `isTabHiddenRef.current` (linia 1605).

### Plik: `src/components/training/VideoControls.tsx`

Bez zmian — iOS fix z poprzedniej iteracji (Play button enabled during buffering) jest poprawny.

### Plik: `src/lib/videoBufferConfig.ts`

Bez zmian — konfiguracja iOS jest wystarczająca.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Fixes A-F: stale closure ref, iOS tolerance, seeking reset, token dedup, pointer-events, stuck detection |

## Efekt
- `forceHideBuffering` działa prawidłowo na iOS — koniec migania spinnera
- `lastValidTimeRef` ZAWSZE awansuje na iOS gdy wideo gra — postęp się liczy
- `isSeekingRef` nie blokuje timeUpdate w nieskończoność
- Brak podwójnego generowania tokenów
- Overlay nie blokuje dotyku na iOS

