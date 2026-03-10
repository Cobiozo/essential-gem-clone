

# Fix: Opóźnienie w łapaniu sygnału video/audio uczestników

## Diagnoza

Zidentyfikowałem dwa główne wąskie gardła w sygnalizacji WebRTC:

### Problem 1: `call.answer()` wykonywany PO zapytaniach do bazy (krytyczne)
W `peer.on('call')` (linia 1435-1516) system wykonuje **2 sekwencyjne zapytania do Supabase** (lookup uczestnika + avatar) **ZANIM** odpowie na połączenie WebRTC (`call.answer()`). Każde zapytanie to ~100-300ms RTT, co daje **200-600ms opóźnienia** przed rozpoczęciem negocjacji ICE.

```text
TERAZ (wolne):
incoming call → query participant → query avatar → call.answer() → ICE negotiation
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                      200-600ms opóźnienia

PO NAPRAWIE (szybkie):
incoming call → call.answer() → ICE negotiation (natychmiast)
                    ↘ query participant + avatar (async, update metadata później)
```

### Problem 2: Sekwencyjne pobieranie avatarów istniejących uczestników
W `peer.on('open')` (linie 1420-1432) pętla `for...of` pobiera avatar każdego uczestnika **sekwencyjnie** — 3 uczestników = 3 × ~150ms = 450ms. Dopiero po tym callPeer() jest wywoływany.

## Plan zmian

### 1. Natychmiastowy `call.answer()` przed DB lookupami (`peer.on('call')`)
Przenieść `call.answer()` na początek handlera, przed zapytania do bazy. Metadane (nazwa, avatar) zaktualizować asynchronicznie przez `setParticipants` po ich pobraniu.

### 2. Równoległe pobieranie avatarów + natychmiastowy `callPeer()` 
Zamiast sekwencyjnego `for...of` z `await` na avatar, uruchomić `callPeer()` natychmiast z tymczasową nazwą, a avatar pobrać w tle i zaktualizować przez `setParticipants`.

### 3. Batch avatar fetch (opcjonalnie)
Zamiast N osobnych zapytań do `profiles`, jedno zapytanie `WHERE user_id IN (...)`.

| Plik | Zmiana |
|---|---|
| `VideoRoom.tsx` linie ~1435-1516 | `call.answer()` natychmiast, DB lookups async |
| `VideoRoom.tsx` linie ~1413-1432 | Równoległe callPeer + async avatar fetch |

Łączny efekt: **~300-800ms szybsze nawiązanie połączenia** per uczestnik.

