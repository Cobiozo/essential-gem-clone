## Diagnoza: dlaczego zadania nie są zaliczane

Po analizie kodu Edge Function `challenge-daily-supervisor`, funkcji SQL `challenge_count_action`, logów CRON i danych w bazie znalazłem **4 realne błędy**, przez które CRON nie weryfikuje większości zadań.

### 1. CRON loguje do `cron_job_logs` z nieistniejącymi kolumnami (silent fail)
Edge Function wstawia `message` i `duration_ms`, a tabela ma `error_message` i `details`. Wstawienie się wywala → **brak jakichkolwiek logów** o uruchomieniach (potwierdzone: `SELECT * FROM cron_job_logs` = 0 wierszy), choć CRON się boots-uje co godzinę (logi Edge potwierdzają).

### 2. `profile_completion_100` odwołuje się do nieistniejącej kolumny
Funkcja `challenge_count_action` robi `SELECT profile_completion_percentage FROM profiles` — taka kolumna nie istnieje w `profiles`. RPC zwraca błąd → traktowane jako 0 → zadanie „Uzupełnij profil do 100%" **nigdy się nie zaliczy**.

### 3. `resource_view` nie loguje aktywności
`TaskCard` dla typu `resource_view` robi tylko `window.open(...)` i NIE wywołuje `trackActivity('resource_view', { resource_id })`. CRON sprawdza `user_activity_log` po `resource_id`, ale nic tam nigdy nie trafia → zadanie „Przeczytaj zasób PURE KONTAKT" **nigdy się nie zaliczy** (stąd brak Zaliczone na zrzucie).

### 4. `shared_resource_recipients` nie ma źródła zdarzeń
CRON liczy wpisy `action_type='share_send'` w `challenge_activity_log`, ale nigdzie w aplikacji nie wstawiamy takich wpisów przy udostępnianiu zasobu. Zadanie „Udostępnij wideo 10 osobom" **nigdy się nie zaliczy**.

### Status na zrzucie (potwierdzony danymi)
- ✅ Dzień 1 / wideo powitalne — zaliczone (log + completion verified)
- ❌ Dzień 1 / PURE KONTAKT — błąd #3
- ⏳ Dzień 1 / profil 100% — pending, ale błąd #2 blokuje weryfikację
- Streak = 0 bo dzień 1 nie ma wszystkich wymaganych zadań verified

---

## Plan naprawy

### A) Migracja SQL
1. **Fix `challenge_count_action`** — gałąź `profile_completion_100`:
   - usunąć referencję do `profile_completion_percentage`
   - policzyć completion ad-hoc na podstawie istniejących pól `profiles` (mail/telefon/imię/avatar/itp.) lub po prostu sprawdzić zestaw kluczowych pól wypełnionych — zwrócić 1 gdy „kompletny".
2. (Opcjonalnie) dodać gałąź `share_send` z fallbackiem na `team_contacts` × broadcast — albo zostawić jak jest, dopóki nie podepniemy logowania (patrz pkt C).

### B) Edge Function `challenge-daily-supervisor`
- Zamienić `message`/`duration_ms` na `error_message`/`details` + `started_at`/`completed_at`/`processed_count` zgodnie z faktycznym schematem `cron_job_logs`. Dzięki temu zaczniemy widzieć przebiegi.
- Dodać try/catch wokół insertu logu i `console.log(summary)` aby było widać w Edge Logs nawet gdy DB insert zawiedzie.

### C) Frontend — `TaskCard.tsx`
- Dla `resource_view`: przed `window.open` wywołać `useActivityTracking().trackActivity('resource_view', { resource_id }, '/knowledge')` + log do `challenge_activity_log` przez `useChallengeAction`.
- Dla `training_lesson` / `training_lesson_opened`: dodać `trackActivity('training_module_start', { lesson_id })` przed `window.open`.
- Dla `page_view`: dodać `trackActivity('page_view', {}, ref.page_path)` — żeby CRON miał co policzyć.
- Dla `shared_resource_recipients`: na razie best-effort — bez integracji z modułem share zostawić tylko CTA + tooltip „akcja wymaga rzeczywistego udostępnienia w Bazie Wiedzy". (Pełna integracja w osobnym kroku.)

### D) Weryfikacja po wdrożeniu
- Ręcznie odpalić „Sprawdź postęp" → sprawdzić `cron_job_logs` (powinien pojawić się wiersz `success`) i `challenge_task_completions` (PURE KONTAKT + profil 100% powinny zostać `verified`).

### Pliki
- `supabase/migrations/<new>.sql` — fix `challenge_count_action`
- `supabase/functions/challenge-daily-supervisor/index.ts` — fix kolumn logu
- `src/components/challenge/TaskCard.tsx` — dołożenie `trackActivity` w odpowiednich gałęziach
