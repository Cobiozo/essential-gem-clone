

# Audyt iOS: postęp wideo nie odlicza się w Akademii

## Znalezione przyczyny

### Przyczyna 1 (KRYTYCZNA): `lastValidTimeRef` nie aktualizuje się → seek-blocker resetuje wideo do 0

W `SecureMedia.tsx` linia 1042:
```typescript
if (timeDiff > 0 && (timeDiff <= 3 || isBufferingRef.current))
```

Na iOS Safari wideo ładuje się segmentami (HLS-like). Pierwszy `timeupdate` może zgłosić czas > 3s od startu, bo iOS buforuje przed rozpoczęciem odtwarzania. Wtedy `lastValidTimeRef` **nigdy nie awansuje powyżej 0**. Gdy iOS wewnętrznie odpala event `seeking` (zmiana jakości, nowy segment), handler `handleSeeking` (linia 1003) widzi `seekTarget > maxWatchedPosition + 5` i **resetuje wideo do pozycji 0**. Cykl się powtarza — wideo gra, ale postęp stoi.

### Przyczyna 2: `isSeekingRef` blokuje `handleTimeUpdate` przez 500ms po resecie

Po resecie z handleSeeking, `isSeekingRef.current = true` na 500ms (linia 1019). Podczas tego czasu `handleTimeUpdate` robi `return` na linii 1037 — **zero aktualizacji czasu ani callbacków** przez pół sekundy. Na iOS z częstymi seeking events, timeupdate może być blokowane w kółko.

### Przyczyna 3: Spinner buforowania za agresywny na iOS

iOS nie obsługuje Connection API, więc `isSlowNetwork()` zawsze zwraca `false`. Ale `waiting` event odpala się na każdej granicy segmentu HLS. Debounce 1500ms (`spinnerDebounceMs`) jest za krótki — spinner miga ciągle na iOS.

### Przyczyna 4: `playing` event nie jest nasłuchiwany

Brak handlera na event `playing` (fires po odzyskaniu z buffering). Na iOS to kluczowy event do synchronizacji `lastValidTimeRef` po mikro-przerwach.

## Plan naprawy

### Plik: `src/lib/videoBufferConfig.ts`

- Dodać osobne wartości iOS do konfiguracji: `iosTimeDiffTolerance: 15` (zamiast domyślnych 3s)
- Zwiększyć `spinnerDebounceMs` na iOS do 3000ms (z 1500ms)
- Zwiększyć `canplayGuardMs` na iOS do 1000ms (z 500ms)

### Plik: `src/components/SecureMedia.tsx`

**A) Naprawić `handleTimeUpdate` (restricted mode, ~linia 1036)**
- Na iOS: zwiększyć tolerancję timeDiff z 3s do 15s — iOS skoków czasowych po buforowaniu
- Alternatywnie: jeśli `video.playing` i `timeDiff > 0`, zawsze aktualizować `lastValidTimeRef` (nie blokować postępu)
- Logika: `timeDiff <= iosTolerance` zamiast `timeDiff <= 3`

**B) Naprawić `handleSeeking` (~linia 1003)**
- Dodać guard: jeśli wideo NIE jest pauzowane (`!video.paused`), a różnica jest < 15s na iOS, **nie blokować** — to wewnętrzny seek iOS, nie akcja użytkownika
- Na iOS użytkownik i tak nie ma slidera do seekowania (kontrolki to tylko Play/Pause/Rewind)

**C) Dodać handler `playing` event**
- Nowy listener `playing` (fires po odzyskaniu z buffering/seeking):
  - Synchronizować `lastValidTimeRef.current = video.currentTime`
  - Czyścić `isSeekingRef.current = false`
  - Czyścić spinner i buffering state
- Zarejestrować w obu trybach (restricted i unrestricted)

**D) Poprawić debounce spinnera na iOS**
- Użyć `bufferConfigRef.current.spinnerDebounceMs` z uwzględnieniem iOS (3000ms vs 1500ms)
- Po `forceHideBuffering = true` (po 3s playback), ignorować `waiting` events na iOS przez 2s
- Warunek: `if (isIOSDevice() && forceHideBuffering) return` w `handleWaiting`

**E) Naprawić timeupdate w unrestricted mode (~linia 1261)**
- Dodać tę samą logikę iOS tolerance jak w restricted mode (spójność)

### Plik: `src/components/training/VideoControls.tsx`

**F) Play button nie powinien być disabled podczas isBuffering na iOS**
- Linia 117: `disabled={isBuffering}` → `disabled={isBuffering && !isIOSDevice()}`
- Na iOS: pozwolić na tap Play/Pause nawet podczas buforowania (iOS zarządza bufferem sam)

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/lib/videoBufferConfig.ts` | Dodać iOS-specific timeouts |
| `src/components/SecureMedia.tsx` | Fixes A-E: tolerancja, seeking guard, playing event, spinner |
| `src/components/training/VideoControls.tsx` | Fix F: Play enabled during iOS buffering |

## Efekt
- `lastValidTimeRef` awansuje poprawnie na iOS → seek-blocker nie resetuje wideo
- Postęp i czas odliczają się na żywo
- Spinner nie miga na każdym segmencie HLS
- Przycisk "Zalicz lekcję" odblokuje się po obejrzeniu do końca

