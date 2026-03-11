

# Problem: Wydarzenie "TESTOWY" nie pojawia się w "Moje spotkania"

## Diagnoza

W `expandEventsForCalendar` (useOccurrences.ts, linia 158) dla wydarzeń z wieloma terminami (multi-occurrence) klucz rejestracji to `${event.id}:${occ.index}` (np. `abc:0`). Jeśli użytkownik zarejestrował się z `occurrence_index = null`, klucz w mapie to `abc:null`, a szukany klucz to `abc:0` — brak dopasowania. Wynik: `is_registered = false`, więc widget filtruje to wydarzenie.

Dla wydarzeń jednookurencyjnych (linia 176) jest fallback do `event.is_registered`, więc one działają poprawnie.

## Rozwiązanie

**Plik:** `src/hooks/useOccurrences.ts`

Linia 158 — dodać fallback do `event.is_registered` (tak jak dla single-occurrence):

```typescript
// Obecne:
const isRegisteredForOccurrence = registrationMap?.get(registrationKey) ?? false;

// Zmiana na:
const isRegisteredForOccurrence = registrationMap?.get(registrationKey) ?? event.is_registered ?? false;
```

Dzięki temu, jeśli nie ma per-occurrence rejestracji w mapie, system sprawdzi ogólny status `is_registered` ustawiony wcześniej w `useEvents` (bazujący na `registeredEventIds.has(event.id)`). Wydarzenie, na które użytkownik jest zapisany, zawsze pojawi się w widżecie "Moje spotkania".

