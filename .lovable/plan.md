## Cel

Wszystkie czasy wydarzeń wpisywane przez admina są w strefie **Europe/Warsaw (CET/CEST)**. W bazie zapisujemy je jako prawidłowy moment UTC, dzięki czemu każdy użytkownik (w PL, DE, NO, ES, USA itd.) widzi wydarzenie poprawnie skonwertowane na swoją lokalną strefę przez przeglądarkę.

## Diagnoza

W bazie `paid_events` rekord `bom-krakow` wygląda tak:

```
event_date     = 2026-05-10 16:00:00+00   (UTC)
event_end_date = 2026-05-10 18:00:00+00   (UTC)
```

Admin wpisał 16:00–18:00 czasu polskiego, ale wartość z `<input type="datetime-local">` ("2026-05-10T16:00", bez offsetu) trafiła wprost do `timestamptz` w Postgres i została zinterpretowana jako UTC. Polski użytkownik w przeglądarce (CEST = UTC+2) widzi więc 18:00–20:00.

Ten sam wzorzec dotyczy obu edytorów `paid_events` oraz innych formularzy z `datetime-local` (webinary, szkolenia zespołowe, news ticker, tryb konserwacji, ważne info).

## Plan

### 1. Helpery konwersji (nowy plik)

`src/utils/datetimeLocal.ts`:

- `localInputToISO(value, tz = 'Europe/Warsaw')` — bierze `"2026-05-10T16:00"` i zwraca prawidłowy ISO UTC traktując wejście jako czas w `tz` (np. `"2026-05-10T14:00:00.000Z"` latem, `"2026-05-10T15:00:00.000Z"` zimą — uwzględnia DST).
- `isoToLocalInput(iso, tz = 'Europe/Warsaw')` — bierze ISO z bazy i zwraca `"YYYY-MM-DDTHH:mm"` reprezentujący ten moment w strefie `tz`, gotowy do wstawienia jako `value` inputa.

Implementacja oparta o `Intl.DateTimeFormat` z `timeZone` — bez zewnętrznych bibliotek, poprawnie obsługuje DST (CET/CEST).

### 2. Edytory paid_events

W obu plikach zamienić ucinanie ISO na helper i opakować zapis konwersją:

**`src/components/admin/paid-events/PaidEventsList.tsx`** (modal "Edytuj/Utwórz wydarzenie"):
- input value → `isoToLocalInput(formData.event_date)` zamiast `.slice(0,16)`
- przed insert/update w `createMutation` i `updateMutation`: `event_date: localInputToISO(data.event_date)`, analogicznie `event_end_date`.

**`src/components/admin/paid-events/editor/EventMainSettingsPanel.tsx`** (panel "Data i godzina" w pełnym edytorze):
- input value → `isoToLocalInput(...)`
- w `handleSave` przed `updateMutation.mutate(formData)` zbudować payload z konwersją pól dat.
- Etykieta inputów: dopisać hint "(czas Europe/Warsaw – CET/CEST)" żeby admin wiedział w jakiej strefie wpisuje.

### 3. Pozostałe edytory `datetime-local`

Zastosować ten sam helper (zapis + odczyt) w:
- `src/components/admin/WebinarForm.tsx`
- `src/components/admin/TeamTrainingForm.tsx`
- `src/components/admin/NewsTickerManagement.tsx`
- `src/components/admin/ImportantInfoManagement.tsx`
- `src/components/admin/MaintenanceModeManagement.tsx`
- `src/components/admin/InboundApiKeys.tsx` (jeśli to pole `expires_at` — też ma sens trzymać w UTC interpretowany z czasu PL)

Każdy z tych plików: input `value` → `isoToLocalInput(...)`, `onChange`/save → `localInputToISO(...)`. Etykieta z hintem "(czas Europe/Warsaw)".

### 4. Migracja istniejących danych w `paid_events`

Aktualne rekordy mają "naiwny" czas PL zapisany jako UTC. Trzeba je przesunąć tak, żeby reprezentowały ten sam moment, co wpisał admin, ale w prawidłowym UTC.

Operacja SQL:

```sql
UPDATE paid_events
SET 
  event_date     = (event_date::timestamp AT TIME ZONE 'Europe/Warsaw'),
  event_end_date = CASE WHEN event_end_date IS NOT NULL
    THEN (event_end_date::timestamp AT TIME ZONE 'Europe/Warsaw')
    ELSE NULL END;
```

`event_date::timestamp` daje "naiwną" datę bez strefy (16:00), `AT TIME ZONE 'Europe/Warsaw'` interpretuje ją jako warszawską i zwraca `timestamptz` w UTC (14:00Z latem, 15:00Z zimą — z poprawnym uwzględnieniem DST per rekord).

Przed wykonaniem pokażę Ci pełną listę rekordów `paid_events` (id, title, event_date, event_end_date) i poproszę o potwierdzenie zakresu — jeśli są wydarzenia, których nie powinno się ruszać, ograniczymy `WHERE`.

### 5. Inne tabele z dotychczas błędnymi wartościami

W ramach tego samego pełnego fixu rozszerzymy migrację o pozostałe tabele dotknięte tym samym wzorcem (np. `webinars.scheduled_at`, `team_trainings.starts_at`, news ticker, ważne info itp.). Najpierw zrobię `SELECT` próbki z każdej, pokażę Ci co planuję poprawić, i dopiero po Twoim "OK" wykonamy `UPDATE` — żeby nie ruszyć wpisów, które (ewentualnie) były zapisywane już poprawnie z innej ścieżki.

### 6. Walidacja po wdrożeniu

- Sprawdzenie w bazie: `bom-krakow` ma `event_date = 2026-05-10 14:00:00+00`, `event_end_date = 2026-05-10 16:00:00+00`.
- Polski użytkownik w przeglądarce widzi "10 maja 2026, 16:00 – 18:00".
- E-mail rejestracyjny pokazuje 16:00 – 18:00.
- W edytorze admin nadal widzi 16:00 – 18:00 (helper konwertuje z UTC z powrotem na PL).
- Symulacja innej strefy (DevTools → Sensors → Location/Timezone "Europe/Helsinki") — użytkownik widzi 17:00 – 19:00 (CEST→EEST).

## Co dostaniesz po wdrożeniu

- Wszystkie nowe i istniejące daty wydarzeń są spójne i interpretowane jako Europe/Warsaw przy wpisywaniu, a wyświetlane lokalnie u każdego odbiorcy.
- Helper jest jeden i wykorzystywany konsekwentnie we wszystkich edytorach z `datetime-local`.
- DST (zmiana czasu zima/lato) jest obsługiwane automatycznie.

## Pliki do zmiany

- `src/utils/datetimeLocal.ts` (nowy)
- `src/components/admin/paid-events/PaidEventsList.tsx`
- `src/components/admin/paid-events/editor/EventMainSettingsPanel.tsx`
- `src/components/admin/WebinarForm.tsx`
- `src/components/admin/TeamTrainingForm.tsx`
- `src/components/admin/NewsTickerManagement.tsx`
- `src/components/admin/ImportantInfoManagement.tsx`
- `src/components/admin/MaintenanceModeManagement.tsx`
- `src/components/admin/InboundApiKeys.tsx`
- migracja SQL korygująca istniejące rekordy w `paid_events` (i opcjonalnie pozostałe tabele po Twoim potwierdzeniu)