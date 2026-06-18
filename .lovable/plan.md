## Co zmienić

Zadania są w bazie (9 sztuk, dni 1–3) — problem jest taki, że w `ChallengeAdminPage.tsx` taby „Zadania", „Uczestnicy", „Dostęp", „Statystyki" pokazują tylko placeholdery „pojawi się w kolejnym kroku". Trzeba je rzeczywiście zbudować + przejść z indywidualnej daty startu na globalną.

### 1. Globalna data startu (admin decyduje)

**Migracja** — `challenge_settings`:
- `global_start_date DATE` (nullable — gdy null, wyzwanie nie wystartowało)
- `allow_late_join BOOLEAN DEFAULT true` (czy można dołączyć po starcie)

**Backend** — `supabase/functions/challenge-daily-supervisor/index.ts`:
- `calcCurrentDay` używa `settings.global_start_date` zamiast `participant.start_date`.
- Jeśli `global_start_date` w przyszłości lub null → `current_day = 0`, brak weryfikacji.

**Frontend uczestnika** — `ChallengeOnboarding.tsx`:
- Usunąć `<Input type="date">` i opis „możesz wystartować dziś…".
- Pokazać info-box: data startu, ile dni zostało / „wyzwanie trwa, dzień X" / „termin wkrótce".
- Insert do `challenge_participants` bez `start_date` (domyślnie = `global_start_date` przez DEFAULT lub trigger).

### 2. Edytor zadań w admin panelu (tab „Zadania")

Pełny CRUD na `challenge_tasks`:
- Lista pogrupowana po `day_number` (akordeon: Dzień 1, Dzień 2, …).
- Dla każdego zadania: tytuł, opis, typ (`video_watch | resource_view | manual_confirm | external_action | button_click | training_lesson | link_visit | page_view`), punkty, wymagane do postępu, aktywne, `sort_order`.
- Edytor `target_ref` (JSON) — uproszczone pola w zależności od typu (resource_id, lesson_id, required_seconds, count, check, page itd.) + raw JSON fallback.
- Akcje: dodaj zadanie do dnia, edytuj, usuń, duplikuj na inny dzień, włącz/wyłącz.

### 3. Tab „Uczestnicy"

Tabela: imię, email, status, current_day, current_streak, total_points, start_date, completion_date. Filtr po statusie + akcja „usuń z wyzwania" / „resetuj postęp".

### 4. Tab „Dostęp"

Lista `challenge_user_access` + dodawanie/usuwanie (autocomplete user). Drugi blok: `challenge_leader_permissions` (admin nadaje liderowi prawo zarządzania jego downline).

### 5. Tab „Statystyki"

Karty: liczba uczestników aktywnych / ukończonych / porzuconych, średni dzień, top 10 rankingu, % ukończenia zadań per dzień (od 1 do duration_days).

### Pliki

- Migracja: dodanie pól w `challenge_settings`.
- `supabase/functions/challenge-daily-supervisor/index.ts` — global date.
- `src/types/challenge.ts` — pola `global_start_date`, `allow_late_join`.
- `src/components/challenge/ChallengeOnboarding.tsx` — usunięcie pickera.
- `src/pages/ChallengeAdminPage.tsx` — wpięcie 4 nowych komponentów tabów.
- Nowe: `src/components/challenge/admin/TasksEditor.tsx`, `TaskFormDialog.tsx`, `ParticipantsTable.tsx`, `AccessManager.tsx`, `ChallengeStats.tsx`.
