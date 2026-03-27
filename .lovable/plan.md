

# Fix: "Spotkanie jest w trakcie" pojawia się podczas oglądania

## Problem
Użytkownik ogląda auto-webinar, ale po ~5 minutach od startu slotu (gdy `sinceSlot > lateJoinMaxSec`) interwałowa rekalkualcja w `useAutoWebinarSync` ponownie sprawdza warunek spóźnienia i ustawia `isTooLate = true`, wyrzucając widza z odtwarzania.

Warunek na linii 350:
```typescript
if (sinceSlot > lateJoinMaxSec && duration > 0 && sinceSlot < duration && !bypassLateBlock)
```

`bypassLateBlock` jest `true` tylko gdy istnieje sesja w localStorage (powracający gość). Ale nowy gość, który przyszedł na czas i ogląda — ma `bypassLateBlock = false`. Po 5 minutach odtwarzania rekalkualcja go wyrzuca.

## Rozwiązanie
Dodać wewnętrzny ref `hasStartedPlaying` w hooku `useAutoWebinarSync`. Gdy video zostanie raz uruchomione (faza `playing` z `sinceSlot >= 0`), ref ustawiany na `true`. Późniejsze sprawdzenie late-join jest pomijane, jeśli `hasStartedPlaying` jest `true`.

### Zmiana w `src/hooks/useAutoWebinarSync.ts`

1. Dodać `useRef` — `hasStartedPlayingRef` (inicjalnie `bypassLateBlock`)
2. Przed late-join check: jeśli `hasStartedPlayingRef.current === true` → pomiń blokadę
3. Gdy video gra (playing, sinceSlot >= 0) → ustawić `hasStartedPlayingRef.current = true`
4. Resetować ref gdy zmienia się `guestSlotTime` lub `config`

```typescript
// W hooku, obok innych stanów:
const hasStartedPlayingRef = useRef(bypassLateBlock);

// W calculateExplicitSlots, linia ~350:
if (sinceSlot > lateJoinMaxSec && duration > 0 && sinceSlot < duration 
    && !bypassLateBlock && !hasStartedPlayingRef.current) {
  // ... isTooLate
}

// W sekcji "Playing" (~361):
hasStartedPlayingRef.current = true;
```

Analogiczna zmiana dla sekcji zalogowanych użytkowników (linie ~420+), choć tam late-join check nie istnieje — wystarczy upewnić się, że `findCurrentSlot` nie traci aktywnego okna.

| Plik | Zmiana |
|------|--------|
| `useAutoWebinarSync.ts` | Ref `hasStartedPlayingRef` — pomija late-join check po rozpoczęciu odtwarzania |

