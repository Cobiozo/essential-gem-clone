## Moduł "Wyzwanie 90-dniowe" — fundament

Nowy moduł, który nie zmienia żadnej istniejącej funkcjonalności. Tworzymy podstawę pod rozbudowę krok po kroku.

### Zakres etapu 1

1. Schemat bazy (tabele + RLS + GRANTy + enum + funkcje SECURITY DEFINER)
2. Routing i widoczność (admin + uczestnik)
3. Onboarding (regulamin + instrukcja + „Dołączam")
4. Panel admina (ustawienia, zadania, uczestnicy, dostęp, statystyki)
5. Widok uczestnika (dzisiejsze zadania, postęp, ranking/podium)
6. CRON nadzorujący (codzienna weryfikacja, przesuwanie dni, wykluczenia)
7. Profesjonalny wygląd z charakterem
8. Lider — włączanie dostępu tylko dla osób z ukończonym „Szybkim Startem"

---

### Decyzje (potwierdzone)

- **Czas wyzwania:** **kalendarzowy**, ale start liczony od `start_date` ustawionego per uczestnik (domyślnie data dołączenia, admin/lider może wybrać inny dzień). Globalnie i per uczestnik można wskazać **dni wykluczone** (`excluded_dates[]`) — te dni nie liczą się do 90 i nie generują zadań (np. święta, weekendy jeśli admin tak ustawi).
- **Lider:** widzi **statystyki swojej struktury w dół**, ale tylko jeśli admin nadał mu uprawnienie `can_view_structure_stats`. Lider może **nadać dostęp tylko użytkownikom, którzy mają ukończony moduł „Szybki Start" w Akademii** (twardy warunek serwerowy).
- **Ranking:** **globalny ranking widoczny dla uczestników** — podium (top 3) + lista pozostałych z punktami i pozycją. Admin widzi pełne statystyki szczegółowe (per dzień, per zadanie, retencja, drop-off, średni czas wykonania).

---

### 1. Baza danych (jedna migracja)

Enumy: `challenge_task_type` (`button_click`, `link_visit`, `file_download`, `video_watch`, `resource_view`, `training_lesson`, `manual_confirm`, `external_action`), `challenge_participant_status` (`active`/`paused`/`completed`/`abandoned`), `challenge_completion_status` (`pending`/`verified`/`rejected`).

Tabele w `public` (wszystkie z GRANT do `authenticated` + `service_role`, RLS ENABLED):

- **`challenge_settings`** (singleton `id=true`) — nazwa, podtytuł, regulamin (HTML), instrukcja (HTML), banner URL, akcent kolorystyczny, czas trwania (default 90), globalne `excluded_weekdays[]` i `excluded_dates[]`, `ranking_visible_to_participants` (bool), `szybki_start_module_id` (referencja do `training_modules` — który moduł Akademii kwalifikuje).
- **`challenge_user_access`** — `user_id`, `granted_by`, `granted_at`. Override per użytkownik (admin lub uprawniony lider).
- **`challenge_leader_permissions`** — `leader_id`, `can_grant_access` (bool, default true gdy admin doda lidera), `can_view_structure_stats` (bool, default false — admin ręcznie nadaje).
- **`challenge_participants`** — `user_id`, `start_date` (data kalendarzowa startu), `accepted_terms_at`, `current_day` (1–90, wyliczane dynamicznie), `total_points`, `current_streak`, `longest_streak`, `status`, `completion_date`, `excluded_dates[]` (override per uczestnik, np. urlop).
- **`challenge_tasks`** — `day_number` (1–N), `title`, `description` (rich text), `task_type`, `target_ref` (JSONB — np. `{resource_id, lesson_id, video_id, url, file_path, required_seconds}`), `points`, `required_to_advance`, `verification_mode` (`auto`/`manual_admin`), `is_active`, `sort_order`.
- **`challenge_task_completions`** — `participant_id`, `task_id`, `completed_at`, `verified_at`, `verified_by`, `verification_status`, `evidence` (JSONB), `points_awarded`. Unique `(participant_id, task_id)`.
- **`challenge_activity_log`** — pełen audyt akcji uczestnika (typ akcji, ref, czas, IP).

Funkcje SECURITY DEFINER (`SET search_path = public`):

- `public.has_challenge_access(_uid uuid) returns boolean` — admin OR per-user override OR (lider w górę łańcucha ma `can_grant_access` i nadał ten dostęp przez `challenge_user_access`).
- `public.user_completed_szybki_start(_uid uuid) returns boolean` — sprawdza `training_progress` dla `szybki_start_module_id` z `challenge_settings` (wszystkie lekcje ukończone).
- `public.can_leader_grant_challenge(_leader_id uuid, _target_user_id uuid) returns boolean` — `_target_user_id` jest w strukturze w dół lidera AND `user_completed_szybki_start(_target_user_id)` AND lider ma `can_grant_access = true`.
- `public.can_leader_view_challenge_stats(_leader_id uuid) returns boolean` — `challenge_leader_permissions.can_view_structure_stats = true`.
- `public.calculate_challenge_day(_participant_id uuid) returns int` — liczy dni od `start_date` z wykluczeniem `excluded_weekdays` z settings + `excluded_dates` z settings + `excluded_dates` z participanta.

RLS:
- `challenge_participants`: SELECT — sam siebie OR admin OR (lider z `can_view_structure_stats` widzi swoją strukturę).
- `challenge_task_completions`: tak samo.
- `challenge_tasks`: SELECT dla wszystkich z `has_challenge_access`; INSERT/UPDATE/DELETE tylko admin.
- `challenge_settings`: SELECT dla wszystkich auth; UPDATE admin.
- `challenge_user_access`: INSERT przez admina OR przez lidera tylko gdy `can_leader_grant_challenge`.

Seed: po migracji — `supabase--insert` z `INSERT INTO challenge_user_access (user_id, granted_by) SELECT id, id FROM profiles WHERE username = 'sebastiansnopek87' OR email LIKE 'sebastiansnopek87%' LIMIT 1;`

### 2. Routing i widoczność

- `/wyzwanie-90` — strona uczestnika (gate `has_challenge_access`).
- `/admin?tab=challenge` — zakładka admina (pod-zakładki: Ustawienia / Zadania / Uczestnicy / Dostęp / Statystyki).
- `/panel-lidera?tab=challenge` — zakładka lidera (Moja struktura / Nadaj dostęp / Statystyki — ostatnia widoczna tylko gdy `can_view_structure_stats`).
- Wpis do `KNOWN_APP_ROUTES`, brak `PUBLIC_PATHS` (auth-only).
- Sidebar/menu: pozycja warunkowa na `has_challenge_access`.

### 3. Onboarding uczestnika

`ChallengeOnboarding`:
- Hero z banerem i nazwą.
- Zakładki **Regulamin** i **Instrukcja** (HTML z settings).
- Wybór `start_date` (domyślnie dziś, można przesunąć w przyszłość — np. „startuję od poniedziałku").
- Checkbox „Akceptuję regulamin".
- Przycisk **Dołączam** → tworzy `challenge_participants` z `accepted_terms_at = now()`.

### 4. Panel admina

`src/components/admin/challenge/`:
- `ChallengeSettingsTab` — regulamin, instrukcja, banner, kolor, wybór modułu „Szybki Start", globalne wykluczenia dni.
- `ChallengeTasksTab` — siatka 90 dni; per dzień lista zadań; modal dodawania z pickerem zasobu (re-use pickerów resources/lessons/videos/files/URL).
- `ChallengeAccessTab` — `UserAccessPicker` + lista liderów z dwoma togglami: `can_grant_access`, `can_view_structure_stats`.
- `ChallengeParticipantsTab` — tabela uczestników, postęp, punkty, status, akcje (reset, pauza, dodaj wykluczone dni, ręczna weryfikacja zadania).
- `ChallengeStatsTab` — szczegółowe wykresy (Recharts): aktywni w czasie, retencja per dzień, drop-off, top/bottom zadania, średni czas wykonania, ranking pełny, heatmapa aktywności.

### 5. Panel lidera

`src/components/leader/challenge/`:
- Lista użytkowników z mojej struktury z flagą „Szybki Start ukończony" (tylko ci mogą dostać dostęp).
- Przycisk „Nadaj dostęp" — wywołuje `can_leader_grant_challenge` (server-side guard).
- Zakładka „Statystyki struktury" — widoczna tylko gdy `can_view_structure_stats` (toggle przez admina).

### 6. Widok uczestnika (po dołączeniu)

- Hero: dzień `X/90`, pasek postępu, suma punktów, streak.
- Karta **Dzisiejsze zadania** — lista z odpowiednimi interakcjami per `task_type`:
  - `video_watch` → `LazyVideoPlayer` + tracking `watched_seconds`,
  - `file_download` → przycisk + log,
  - `link_visit`/`button_click` → przycisk z trackingiem,
  - `resource_view`/`training_lesson` → link do modułu + sprawdzenie ukończenia w istniejących tabelach,
  - `manual_confirm` → checkbox z opisem.
- **Historia poprzednich dni** — podgląd, opcjonalnie „nadrób" jeśli `verification_mode = auto`.
- **Ranking** (jeśli `ranking_visible_to_participants`): podium top 3 (z efektem złoto/srebro/brąz) + tabela pozostałych z pozycją i punktami, własna pozycja zawsze podświetlona.
- **Streak** — dni z rzędu z kompletem zadań.

### 7. Edge function CRON

`supabase/functions/challenge-daily-supervisor/index.ts`:
- Codziennie o 06:00 Warszawa (przez `pg_cron` + `pg_net`, logika dat przez `warsawLocalToUtc`).
- Dla każdego aktywnego uczestnika:
  - przelicza `current_day` przez `calculate_challenge_day` (z wykluczeniami),
  - auto-weryfikuje zadania `auto` na podstawie `evidence` (czas wideo, lekcja ukończona, plik pobrany),
  - oznacza zadania `manual_admin` jako `pending` z notyfikacją w panelu admina,
  - sumuje punkty do `total_points`, aktualizuje `current_streak`/`longest_streak`,
  - przy `current_day > 90` → `status = 'completed'`, `completion_date = now()`,
  - log do `cron_job_logs`.

### 8. Profesjonalny wygląd

- Dedykowany hero z gradientem opartym o `accent_color`, animowany pasek postępu.
- Glassmorphism na kartach zadań, ikony per typ z `lucide-react`, kolorowe statusy.
- `framer-motion`: puls przy zaliczeniu, konfetti po ukończeniu wszystkich zadań dnia.
- Podium rankingu z 3D-cieniami i metalicznym akcentem (złoto/srebro/brąz).
- Bento-grid statystyk admina.
- Semantic tokens w `index.css`: `--challenge-primary`, `--challenge-accent`, `--challenge-gold`, `--challenge-silver`, `--challenge-bronze`.

### 9. Czego NIE robimy w etapie 1

- Powiadomienia push/email per dzień (kolejny etap razem z `notification_event_types`).
- Eksport rankingu do PDF/Excel.
- i18n (na razie PL; struktura przygotowana pod tłumaczenia).
- Certyfikaty/nagrody po ukończeniu.

### Pliki

**Migracja:** jedna z tabelami + enumy + RLS + GRANT + 5 funkcji security definer.

**Seed (przez `supabase--insert`):** dostęp dla `sebastiansnopek87`.

**Edge function:** `supabase/functions/challenge-daily-supervisor/index.ts` + wpis `pg_cron` przez `supabase--insert`.

**Frontend nowe:**
- `src/pages/ChallengePage.tsx`
- `src/components/challenge/` (Onboarding, Dashboard, TaskCard, Progress, Ranking, Podium, Streak)
- `src/components/admin/challenge/` (5 zakładek)
- `src/components/leader/challenge/` (3 widoki)
- `src/hooks/useChallengeAccess.ts`, `useChallengeParticipant.ts`, `useChallengeTasks.ts`, `useChallengeStats.ts`, `useChallengeRanking.ts`, `useChallengeLeaderGrant.ts`
- `src/types/challenge.ts`

**Frontend edycje (minimalne, bez zmiany istniejącej logiki):**
- `src/App.tsx` — trasa `/wyzwanie-90`.
- `src/components/admin/AdminPanel.tsx` — zakładka „Wyzwanie 90-dniowe".
- panel lidera — zakładka „Wyzwanie 90-dniowe".
- `src/components/layout/Sidebar.tsx` — warunkowa pozycja menu.
- `src/index.css` — tokeny `--challenge-*`.

Po akceptacji ruszam od migracji.
