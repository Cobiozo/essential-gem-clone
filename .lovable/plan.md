
# Plan: Naprawa synchronizacji czasu z Google Calendar

## Zidentyfikowane problemy

### Problem 1: Wydarzenie TEAM ZOOM pokazuje +1h w Google Calendar

**Przyczyna**: Funkcja `getOccurrenceDateTime` w `sync-google-calendar/index.ts` nieprawidłowo interpretuje czas z occurrences jako UTC zamiast jako czas lokalny (Europe/Warsaw).

Kod błędny (linia 73):
```typescript
const startDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
```

Wynik:
- `20:00` w occurrences → traktowane jako 20:00 UTC → wyświetlane jako 21:00 CET

### Problem 2: Dorota Hamerska - Google Calendar nie blokuje slotów

**Przyczyna zewnętrzna**: Google FreeBusy API zwraca `busy: []`. Kod jest poprawny, ale:
1. Wydarzenie może być oznaczone jako "Free" zamiast "Busy"
2. Wydarzenie może być na innym kalendarzu niż główny
3. Może być połączone inne konto Google (brak emaila w bazie - stare połączenie)

---

## Rozwiązanie

### Zmiana 1: Naprawa funkcji `getOccurrenceDateTime`

**Plik**: `supabase/functions/sync-google-calendar/index.ts`

Zmienić logikę tworzenia daty z occurrences tak, aby interpretować czas jako Europe/Warsaw:

```typescript
// PRZED (błędne - traktuje jako UTC):
const startDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

// PO (poprawne - traktuje jako Warsaw time i konwertuje do UTC):
// Tworzymy datę w strefie Warsaw i formatujemy do ISO
const warsawDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

// Dla CET/CEST offset:
// - Zima (CET): UTC+1 → odejmujemy 1h
// - Lato (CEST): UTC+2 → odejmujemy 2h
// Użyjemy prostego podejścia: sprawdzamy datę i stosujemy odpowiedni offset
const isSummerTime = (month >= 3 && month <= 10); // Uproszczone
const offsetHours = isSummerTime ? 2 : 1;

const startDate = new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes));
```

Alternatywnie - użyć formatu z timezone w Google Calendar API:
```typescript
return {
  start_time: `${year}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}T${occurrence.time}:00`,
  end_time: ...,
  timezone: 'Europe/Warsaw', // Nowy parametr
};
```

A następnie w `formatGoogleEvent` użyć tego timezone:
```typescript
start: {
  dateTime: startTime.toISOString(),
  timeZone: eventTimezone || 'Europe/Warsaw', // Z wydarzenia
},
```

---

## Szczegółowe zmiany techniczne

### Plik: `supabase/functions/sync-google-calendar/index.ts`

| Lokalizacja | Obecny kod | Nowy kod |
|-------------|------------|----------|
| Linia 28-34 | `getOccurrenceDateTime` zwraca tylko `start_time`, `end_time` | Dodać parametr `timezone` do wyniku |
| Linia 68-81 | Tworzy `Date.UTC()` z godzinami z occurrences | Zwrócić lokalną datę + timezone zamiast konwertować do UTC |
| Linia 225-262 | `formatGoogleEvent` używa `'Europe/Warsaw'` na sztywno | Użyć timezone z wydarzenia/occurrences |

### Plik: `supabase/functions/check-google-calendar-busy/index.ts`

Opcjonalnie - rozszerzyć o sprawdzanie wszystkich kalendarzy użytkownika (nie tylko `primary`), ale to wymaga dodatkowego scope `calendar.readonly` dla listy kalendarzy.

---

## Rekomendacja dla Doroty Hamerskiej

Aby zweryfikować problem:
1. Rozłączyć i ponownie połączyć konto Google Calendar (wtedy zostanie zapisany email)
2. Sprawdzić w Google Calendar czy wydarzenie na 10.02 16:00 jest:
   - Na głównym kalendarzu (Primary)
   - Oznaczone jako "Busy" (nie "Free")
3. Upewnić się, że jest zalogowana na tym samym koncie Gmail co w aplikacji PureLife

---

## Rezultat

Po wdrożeniu:
- Wydarzenia cykliczne (TEAM ZOOM, Pure Calling) będą synchronizowane z prawidłową godziną
- Sebastian zobaczy 20:00 CET w swoim Google Calendar (zamiast 21:00)
- Istniejące zsynchronizowane wydarzenia trzeba będzie usunąć i dodać ponownie (lub ręcznie poprawić w Google Calendar)
