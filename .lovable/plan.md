

## Diagnoza: „Szkolenie Techniczne" w widżecie Moje spotkania

### Co znalazłem

**„Szkolenie Techniczne" to NIE jest wydarzenie cykliczne** — nie ma tablicy `occurrences`. Jest to zwykłe, jednorazowe wydarzenie (`team_training`) zaplanowane na 31.03.2026 18:00–19:00 UTC.

**W bazie jest 25 aktywnych rejestracji** na to wydarzenie — wszystkie z `occurrence_index: null`, `occurrence_date: null`, `occurrence_time: null`. Są to poprawne rejestracje na wydarzenie jednorazowe. Kod logicznie je uznaje za aktywne (bo nie mają indeksu — nie są „legacy").

### Dlaczego widżet to pokazuje

Widżet „Moje spotkania" działa poprawnie:
1. `fetchEvents()` → buduje `registeredEventIds` z rejestracji gdzie `occurrence_index IS NULL` → trafia tu „Szkolenie Techniczne"
2. `expandEventsForCalendar()` → dla wydarzenia bez occurrences ustawia `is_registered: true` na bazie `registrationMap`
3. `MyMeetingsWidget` → filtruje `e.is_registered === true` → wyświetla

### Kluczowe pytanie

**Skoro w bazie jest aktywna rejestracja Twojego konta na „Szkolenie Techniczne", to czy:**
- Ktoś (admin/lider) mógł Cię zarejestrować hurtowo?
- Zarejestrowałeś się i zapomniałeś?
- Chcesz po prostu się wypisać z tego wydarzenia?

**To nie jest błąd kodu** — system poprawnie wyświetla wydarzenia, na które istnieje aktywna rejestracja w bazie danych. Problem leży w danych (rejestracja istnieje, choć nie powinna).

### Proponowane rozwiązanie

1. **Jeśli rejestracja jest błędna** — mogę anulować ją w bazie (punktowo, tylko Twoje konto)
2. **Jeśli ktoś rejestruje hurtowo** — mogę sprawdzić, czy istnieje taki mechanizm i go zabezpieczyć
3. **Jeśli chcesz opcję „Wypisz się" w widżecie** — mogę dodać przycisk anulowania rejestracji bezpośrednio w widżecie „Moje spotkania" dla wydarzeń grupowych (teraz jest tylko Badge „Zapisany/a" bez przycisku wypisania)

### Szczegóły techniczne
- Event ID: `b3b1c7f8-b8e3-4d9d-8932-b42bd57f634f`
- Typ: `team_training` (jednorazowe, bez `occurrences`)
- 25 aktywnych rejestracji, wszystkie z `occurrence_index: null`
- Poprzednie poprawki (cleanup legacy indeksów) nie dotyczą tego przypadku — tu nie ma indeksów do wyczyszczenia
- Kod w `useEvents.ts`, `useOccurrences.ts` i `MyMeetingsWidget.tsx` działa zgodnie z logiką

