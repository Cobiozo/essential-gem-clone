

# Przyspieszenie przywracania streamu po odświeżeniu

## Problem
Po odświeżeniu strony `init()` blokuje się na dwóch kosztownych krokach sekwencyjnych:
1. **`getUserMedia`** — każda próba w `acquireMediaByPreference` może trwać 1-3s (szczególnie video na mobile)
2. **TURN race timeout** — 500ms czekania, a potem `getTurnCredentials()` w tle wykonuje `testTurnServer()` z timeoutem **3000ms na każdy serwer**

Te dwa kroki wykonują się **sekwencyjnie** (najpierw media, potem TURN race), mimo że są niezależne.

## Plan zmian

### 1. Równoległe pobieranie mediów i TURN (`VideoRoom.tsx` — `init()`)
Uruchomić `getTurnCredentials()` **równolegle** z `acquireMediaByPreference()`, a nie po nim. Obie operacje nie zależą od siebie.

```typescript
// PRZED (sekwencyjne):
stream = await acquireMediaByPreference(initialVideo, initialAudio);
const iceServersPromise = getTurnCredentials();
const raceResult = await Promise.race([...500ms...]);

// PO (równoległe):
const iceServersPromise = getTurnCredentials();  // start natychmiast
stream = lobbyStreamAlive ? initialStream : await acquireMediaByPreference(initialVideo, initialAudio);
// TURN prawdopodobnie już gotowy, bo biegł w tle
const raceResult = await Promise.race([...200ms...]);
```

### 2. Zmniejszenie TURN race timeout z 500ms → 200ms
Skoro TURN startuje wcześniej (równolegle z getUserMedia), wystarczy krótszy timeout — TURN miał więcej czasu na odpowiedź.

### 3. Zmniejszenie `testTurnServer` timeout z 3000ms → 1500ms
3 sekundy na test jednego serwera TURN to za dużo. Jeśli TURN nie odpowie w 1.5s, i tak nie będzie użyteczny dla real-time. To przyspiesza fallback do STUN.

### 4. Cache TURN credentials w sessionStorage (opcjonalnie)
Przy odświeżeniu TURN credentials (ważne ~5 min) mogą być reużyte bez ponownego wywołania edge function. Zaoszczędzi to RTT do Supabase.

| Plik | Zmiana |
|---|---|
| `VideoRoom.tsx` | Przeniesienie `getTurnCredentials()` przed `acquireMediaByPreference()` w `init()` |
| `VideoRoom.tsx` | TURN race timeout 500→200ms |
| `VideoRoom.tsx` | `testTurnServer` timeout 3000→1500ms |
| `VideoRoom.tsx` | Cache TURN credentials w sessionStorage (TTL 4min) |

Łączny efekt: **~1-3s szybszy start** po odświeżeniu.

