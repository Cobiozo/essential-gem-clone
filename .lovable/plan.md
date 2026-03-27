

# Fix: podwójny LIVE badge + analiza niezależności BO/HC

## Problem 1: Dwa sloty jednocześnie oznaczone jako LIVE

`getSlotStatus()` w `AutoWebinarEventView.tsx` używa `interval_minutes` (domyślnie 60 min) jako okna trwania slotu. Przy slotach 10:00, 10:30, 11:00 — o 10:35 zarówno 10:00 (okno do 11:00) jak i 10:30 (okno do 11:30) wchodzą w zakres LIVE.

### Rozwiązanie
Zmienić logikę `getSlotStatus` tak, aby okno slotu kończyło się przy starcie następnego slotu (a nie po stałym `interval_minutes`):
- Dla slotu 10:00, gdy następny to 10:30 → okno 10:00–10:30
- Dla slotu 10:30, gdy następny to 11:00 → okno 10:30–11:00
- Dla ostatniego slotu dnia → użyć `interval_minutes` jako fallback

**Plik: `src/components/auto-webinar/AutoWebinarEventView.tsx`**
- Zmienić `getSlotStatus` aby przyjmował listę wszystkich slotów i wyznaczał koniec okna na podstawie następnego slotu w kolejce

## Problem 2: Czy BO i HC mogą działać jednocześnie o tej samej godzinie?

**Odpowiedź: TAK, architektura jest niezależna.** Każda kategoria ma:
- Osobny wiersz w `auto_webinar_config` (filtr `category`)
- Osobną playlistę wideo (powiązaną przez `config_id`)
- Osobną instancję `useAutoWebinarSync` w swoim pokoju
- Osobne trasy (`/auto-webinar/business` vs `/auto-webinar/health`)
- Goście rejestrują się na konkretne wydarzenie (slug) → trafiają do właściwego pokoju

**Jedno drobne ryzyko** — klucz sesji localStorage: `aw_session_${email}_${date}` nie zawiera kategorii. Jeśli ten sam gość ogląda BO i HC tego samego dnia, sesje mogą się nadpisywać. Naprawię to dodając kategorię do klucza.

### Drobna poprawka
**Plik: `src/components/auto-webinar/AutoWebinarEmbed.tsx`**
- Zmienić klucz sesji na `aw_session_${category}_${email}_${date}`

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `AutoWebinarEventView.tsx` | `getSlotStatus` — okno slotu kończy się przy następnym slocie, nie po stałym interwale |
| `AutoWebinarEmbed.tsx` | Klucz sesji localStorage z kategorią |

