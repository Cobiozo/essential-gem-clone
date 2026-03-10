

# Fix: Brak przełączania mówcy + avatar zamiast czarnego tła

## Problem 1: Widok mówcy nie przełącza się

**Przyczyna**: `useActiveSpeakerDetection` ma `[participants]` jako zależność `useEffect`, ale `allParticipants` jest tworzony jako nowa tablica przy każdym renderze. `setAudioLevels()` wewnątrz `setInterval` wywołuje re-render → nowy `allParticipants` → cleanup efektu kasuje `setInterval` → nowy interval → 250ms → `setAudioLevels` → re-render → pętla. Interval żyje max 250ms i jest resetowany, ale główny problem to: **AudioContext może pozostać `suspended`** bo `resume()` w linii 436 jest wołane tylko raz przy montowaniu efektu. Jeśli nie zadziała (brak gestu), kolejny re-render nie ponawia próby (bo `ctx.state` wciąż `suspended` ale efekt rejestruje listenery `{ once: true }` które mogły już się odpalić bez skutku).

Dodatkowo: brak stabilnej referencji `allParticipants` powoduje ciągłe re-mount efektu (co jest nieefektywne, ale nie łamie funkcjonalności).

## Problem 2: Czarne tło zamiast avatara

Gdy zdalny użytkownik wyłączy kamerę:
- **`VideoTile`** (główny widok mówcy): Pokazuje avatar z inicjałami ✓
- **`ThumbnailTile`** (miniaturki w speaker mode): Pokazuje generyczną ikonę `<User>` ✗
- **`MiniVideo`** (multi-speaker/screen share): Pokazuje generyczną ikonę `<User>` ✗
- **`DraggableFloatingPiP`**: Pokazuje avatar ✓

## Plan zmian (1 plik: `VideoGrid.tsx`)

### Zmiana 1: Stabilizacja AudioContext w speaker detection
W `useActiveSpeakerDetection`, wewnątrz `setInterval` (linia 473), na początku każdego ticku sprawdzić `ctx.state === 'suspended'` i wywołać `ctx.resume()`. To gwarantuje odblokowanie AudioContext przy pierwszym ticku po geście użytkownika.

### Zmiana 2: Memoizacja `allParticipants`
W głównym `VideoGrid`, owinąć `allParticipants` w `useMemo` aby uniknąć ciągłego re-mount efektu w `useActiveSpeakerDetection`.

### Zmiana 3: Avatar w `ThumbnailTile`
Zastąpić `<User className="h-5 w-5 text-zinc-500" />` (linia 405-407) avatarem z inicjałami/zdjęciem, analogicznie do `VideoTile` (linia 282-294), przeskalowanym do rozmiaru miniaturki.

### Zmiana 4: Avatar w `MiniVideo`
Zastąpić `<User className="h-5 w-5 text-zinc-500" />` (linia 675) avatarem z inicjałami/zdjęciem.

| Zmiana | Opis |
|---|---|
| AudioContext resume w interval | Każdy tick sprawdza i odblokuje suspended ctx |
| useMemo allParticipants | Stabilna referencja → mniej re-mountów efektu |
| ThumbnailTile avatar | Inicjały/zdjęcie zamiast ikony User |
| MiniVideo avatar | Inicjały/zdjęcie zamiast ikony User |

