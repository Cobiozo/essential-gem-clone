
# Plan: Naprawa synchronizacji czasu z Google Calendar

## ✅ ZREALIZOWANO

### Problem 1: Wydarzenie TEAM ZOOM pokazuje +1h w Google Calendar

**Rozwiązanie wdrożone:**

1. Funkcja `getOccurrenceDateTime` teraz zwraca **lokalny czas** (nie UTC) wraz z informacją `is_local_time: true` i `timezone: 'Europe/Warsaw'`

2. Funkcja `formatGoogleEvent` rozpoznaje lokalne czasy i przekazuje je bezpośrednio do Google Calendar API z parametrem `timeZone`

3. Google Calendar interpretuje czas lokalny (np. `2026-02-02T20:00:00`) w strefie `Europe/Warsaw`, co daje poprawną godzinę 20:00 CET

**Wynik:** Wydarzenia cykliczne będą synchronizowane z prawidłową godziną.

---

### Problem 2: Dorota Hamerska - Google Calendar nie blokuje slotów

**Status:** Wymaga weryfikacji po stronie użytkownika

**Przyczyna zewnętrzna:** Google FreeBusy API zwraca `busy: []`. Kod jest poprawny, ale:
1. Wydarzenie może być oznaczone jako "Free" zamiast "Busy"
2. Wydarzenie może być na innym kalendarzu niż główny
3. Może być połączone inne konto Google

**Rekomendacja dla Doroty Hamerskiej:**
1. W Ustawieniach → Moje konto sprawdzić jaki email jest wyświetlany przy "Konto Google:"
2. Rozłączyć i ponownie połączyć konto Google Calendar (wtedy zostanie zapisany email)
3. Sprawdzić w Google Calendar czy wydarzenie jest:
   - Na głównym kalendarzu (Primary)
   - Oznaczone jako "Busy" (nie "Free")

---

## Uwagi po wdrożeniu

- Sebastian musi usunąć i ponownie dodać TEAM ZOOM do Google Calendar (lub ręcznie poprawić godzinę)
- Nowe synchronizacje będą już poprawne

