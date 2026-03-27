

# Fix: Wygasanie linków auto-webinarów i powiązanie slotów z datą

## Problem

1. **Linki nigdy nie wygasają** — `getNextSlot()` zawsze znajduje przyszły slot (jeśli 10:00 minęło, przesuwa na jutro). Brak blokady rejestracji na przeszłe sloty auto-webinarów.

2. **Parametr `slot=HH:MM` nie zawiera daty** — ten sam link działa wielokrotnie, na różne dni. Link na "dziś 10:00" po minięciu tej godziny pokazuje rejestrację na "jutro 10:00".

## Rozwiązanie

### A. Dodać datę do parametru `slot` (format: `YYYY-MM-DD_HH:MM`)

**Plik: `src/components/auto-webinar/AutoWebinarEventView.tsx`**
- Zmienić `params.set('slot', selectedSlot.time)` na `params.set('slot', format(day.date, 'yyyy-MM-dd') + '_' + selectedSlot.time)`
- Link zaproszenia będzie zawierał konkretną datę: `/e/slug?ref=XYZ&slot=2026-03-28_10:00`

**Plik: `src/pages/EventGuestRegistration.tsx` — linia 354 (roomLink w emailu)**
- Zmienić `?slot=${nextSlot.time}` na `?slot=${format(nextSlot.date, 'yyyy-MM-dd')}_${nextSlot.time}`

### B. Walidacja daty w `getNextSlot` i blokada przeszłych slotów

**Plik: `src/pages/EventGuestRegistration.tsx` — funkcja `getNextSlot`**
- Rozpoznać nowy format `YYYY-MM-DD_HH:MM` w `preferredTime`
- Jeśli podana data+czas jest w przeszłości → zwrócić `null` (zamiast przesuwać na jutro)
- Zachować wsteczną kompatybilność ze starym formatem `HH:MM` (stare linki nadal działają — przesuwają na najbliższy przyszły slot)
- Zmienić typ zwracany na `{ date: Date; time: string } | null`

**Plik: `src/pages/EventGuestRegistration.tsx` — blokada rejestracji**
- Gdy `getNextSlot` zwraca `null` (slot z datą jest przeszły) → wyświetlić komunikat: "Ten termin webinaru już się odbył. Poproś o nowy link z aktualnym terminem."
- Dotyczy zarówno wyświetlania formularza, jak i procesu submit

### C. Przekazywanie `slot` przez slug resolver

**Plik: `src/pages/EventRegistrationBySlug.tsx`**
- Bez zmian — `slot` jest już przekazywany jako parametr. Nowy format `YYYY-MM-DD_HH:MM` przejdzie transparentnie.

### D. Przekazywanie `slot` do strony watch (auto-webinar room)

**Plik: `src/pages/EventRegistrationBySlug.tsx`** — blok auto_webinar bez ref
- Bez zmian — `slot` przekazywany dalej do `/a-w/:slug`

## Efekt końcowy

- Partner kopiuje zaproszenie na "sobota 28 marca, 10:00" → link: `/e/slug?ref=XYZ&slot=2026-03-28_10:00`
- Gość klika w sobotę o 9:50 → formularz rejestracji na "28 marca 10:00" ✅
- Gość klika w niedzielę → "Ten termin już się odbył" ❌
- Stare linki z `slot=10:00` (bez daty) → nadal działają, pokazują najbliższy przyszły slot

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `EventGuestRegistration.tsx` | `getNextSlot` rozpoznaje datę, zwraca `null` dla przeszłych; blokada UI |
| `AutoWebinarEventView.tsx` | Dodać datę do parametru `slot` w linku zaproszenia |

