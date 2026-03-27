

# Fix: Jedno odliczanie do startu webinaru

## Problem
W `useAutoWebinarSync.ts` (linia 220-227) gdy gość wchodzi wcześniej niż `room_open_minutes_before`:
- **Pierwszy countdown**: odlicza do momentu otwarcia pokoju (`guestSlotSec - roomOpenSec - secondsPastMidnight`)
- **Drugi countdown**: po otwarciu pokoju, odlicza do startu slotu (`Math.abs(sinceSlot)`)

To tworzy dwa oddzielne etapy odliczania. Użytkownik chce **jednego** ciągłego odliczania do startu nagrania.

## Rozwiązanie

### Plik: `src/hooks/useAutoWebinarSync.ts`

**Zmiana w bloku "Too early" (linie 219-227):**
- Zamiast odliczać do otwarcia pokoju, odliczać do startu slotu: `guestSlotSec - secondsPastMidnight`
- Ustawić `isInActiveHours = true` (aby UI wyglądał tak samo jak w fazie "room open")
- Usunąć rozróżnienie na dwa etapy — jeden ciągły countdown od wejścia do startu

**Zmiana w bloku "Room open" (linie 229-237):**
- Bez zmian logicznych — ten blok obsłuży ostatnie sekundy tak jak teraz

### Plik: `src/components/auto-webinar/AutoWebinarEmbed.tsx`

**Zmiana w wyświetlaniu licznika uczestników (linia 550):**
- Zamiast warunku `isInActiveHours`, użyć warunku `secondsToNext <= 300` (5 minut przed startem)
- Dzięki temu licznik uczestników pojawi się płynnie 5 minut przed startem, bez zmiany ekranu

### Efekt końcowy
- Gość wchodzi np. 15 min przed → widzi jeden countdown do startu
- 5 min przed startem → pojawia się licznik oczekujących (na tym samym ekranie)
- Start slotu → nagranie rusza

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `useAutoWebinarSync.ts` | "Too early" odlicza do slotu, nie do otwarcia pokoju; ustawia `isInActiveHours=true` |
| `AutoWebinarEmbed.tsx` | Licznik uczestników pojawia się przy `secondsToNext <= 300` |

