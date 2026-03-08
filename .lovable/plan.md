

# Plan: Okno rejestracji 15 minut po rozpoczęciu spotkania

## Cel
Pozwolić na rejestrację do 15 minut po starcie wydarzenia. Po upływie tego czasu — zablokować rejestrację z komunikatem informacyjnym.

## Logika

Nowy stan: `registrationCutoff = startDate + 15 minut`
- **Przed startem** → "Zapisz się" działa normalnie
- **0–15 min po starcie, niezapisany** → "Zapisz się" nadal dostępne
- **0–15 min po starcie, zapisany** → widoczny przycisk "WEJDŹ"
- **>15 min po starcie, niezapisany** → przycisk "Zapisz się" wyświetla dialog z komunikatem: *"Zapisanie się na spotkanie było możliwe do godz. XX:XX. Aktualnie spotkanie trwa. W przyszłości, aby uniknąć takiej sytuacji, zapisz się wcześniej przed rozpoczęciem spotkania."*
- **>15 min po starcie, zapisany** → przycisk "WEJDŹ" nadal widoczny (dopóki event trwa)

## Zmiany w plikach

### 1. `src/components/events/EventCard.tsx`
- Dodać `registrationCutoff = new Date(startDate.getTime() + 15 * 60 * 1000)`
- Dodać `canStillRegister = now < registrationCutoff`
- Dodać `isAfterCutoff = isLive && !canStillRegister` (spotkanie trwa, ale minęło 15 min)
- Zmienić warunek przycisku "Zapisz się" z `isUpcoming && !isPastEvent` na `(isUpcoming || canStillRegister) && !isPastEvent`
- Gdy `isAfterCutoff` i user kliknie → toast/alert z komunikatem zamiast rejestracji
- Przycisk "WEJDŹ" (Zoom/internal meeting): widoczny dla zarejestrowanych gdy `isLive`

### 2. `src/components/events/EventCardCompact.tsx`
- Analogiczne zmiany jak w EventCard.tsx

### 3. `src/pages/EventGuestRegistration.tsx`
- Zmienić warunek `isPast` (obecnie `now > endDate`) na bardziej granularny:
  - `registrationCutoff = startDate + 15 min`
  - Jeśli `now > registrationCutoff` → zamiast formularza wyświetlić komunikat z godziną cutoff
  - Jeśli `now <= registrationCutoff` → formularz dostępny normalnie

### Pliki do edycji:
1. `src/components/events/EventCard.tsx`
2. `src/components/events/EventCardCompact.tsx`
3. `src/pages/EventGuestRegistration.tsx`

