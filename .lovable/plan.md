

# Fix: Aktywności na żywo w pasku informacyjnym — brak danych

## Problem

Pasek informacyjny próbuje pobierać aktywności (lekcje, certyfikaty, moduły) z tabeli `user_activity_log`, która jest **pusta** (0 rekordów). Hook `useActivityTracking` istnieje, ale **nigdzie nie jest używany** — żaden komponent nie wywołuje `trackActivity()`.

Tymczasem prawdziwe dane istnieją w odpowiednich tabelach:
- **268** ukończonych lekcji w ostatnich 7 dniach (`training_progress`)
- **14** ukończonych modułów (`training_assignments`)
- **14** wygenerowanych certyfikatów (`certificates`)

## Rozwiązanie

Zmienić źródło danych aktywności w `useNewsTickerData.ts` — zamiast czytać z pustej `user_activity_log`, pobierać bezpośrednio z tabel źródłowych. Podejście jest bardziej niezawodne niż poleganie na ręcznym logowaniu zdarzeń.

### Plik: `src/components/news-ticker/useNewsTickerData.ts`

Zastąpić sekcję "Fetch from user_activity_log" (linie ~273-345) nową logiką:

**1. Ukończenie lekcji** (`training_lesson_complete`):
- Zapytanie do `training_progress` z joinem do `training_lessons` → `training_modules` po tytuł modułu
- Filtr: `is_completed = true`, `completed_at >= hoursAgo`
- Limit: `liveActivityMaxItems`

**2. Ukończenie modułu** (`training_module_complete`):
- Zapytanie do `training_assignments` z joinem do `training_modules` po tytuł
- Filtr: `is_completed = true`, `completed_at >= hoursAgo`

**3. Certyfikat** (`certificate_generated`):
- Zapytanie do `certificates` z joinem do `training_modules` po tytuł modułu
- Filtr: `generated_at >= hoursAgo`

**4. Rejestracja na wydarzenie** (`event_registration`):
- Zapytanie do `event_registrations` z joinem do `events` po tytuł
- Filtr: `created_at >= hoursAgo`

Dla każdego typu — pobrać profile użytkowników (batch), sformatować komunikat z datą i nazwiskiem (skróconym: `Jan K.`), dodać do `allItems`.

Sekcje `new_user_welcome` i `new_partner_joined` — bez zmian (już działają poprawnie, czytają z `profiles`).

### Tabele źródłowe i kolumny

| Typ aktywności | Tabela | Kolumna daty | Join |
|---|---|---|---|
| Lekcja | `training_progress` | `completed_at` | `training_lessons(module_id, training_modules(title))` |
| Moduł | `training_assignments` | `completed_at` | `training_modules(title)` |
| Certyfikat | `certificates` | `generated_at` | `training_modules(title)` |
| Rejestracja | `event_registrations` | `created_at` | `events(title)` |

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/news-ticker/useNewsTickerData.ts` | Zastąpić sekcję `user_activity_log` zapytaniami do tabel źródłowych |

