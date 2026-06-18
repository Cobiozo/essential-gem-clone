## Etap 2 — Integracja w PureBox, przykładowe zadania, CRON nadzorujący

Bez zmian w istniejącej logice. Rozszerzamy tylko fundament z etapu 1.

---

### 1. Widoczność: wejście przez rozwinięcie zakładki PureBox

- Moduł NIE pojawia się jako osobna pozycja w głównym sidebarze użytkownika.
- Pozycja **„Wyzwanie 90-dniowe"** zostaje dodana do listy elementów PureBox (`purebox_settings` jako `element_key = 'challenge-90'`), więc rozwija się razem z menu PureBox.
- Widoczność: każdy użytkownik, który ma `has_challenge_access(uid) = true` (admin OR per-user grant OR grant od uprawnionego lidera).
- Hook `usePureBoxVisibility` zostaje rozszerzony o sprawdzenie `has_challenge_access` dla klucza `challenge-90` (nie zmieniamy logiki dla innych elementów PureBox).
- W AdminSidebar pozycja „Wyzwanie 90-dniowe" pozostaje (panel admina), ale dla zwykłego użytkownika wejście jest tylko z PureBox.
- Trasa pozostaje `/wyzwanie-90`.

Seed: `INSERT INTO purebox_settings (element_key, is_active, visible_to_admin, visible_to_partner, visible_to_client, visible_to_specjalista) VALUES ('challenge-90', true, true, true, true, true) ON CONFLICT DO NOTHING;` — i tak gate finalny robi `has_challenge_access`.

---

### 2. Trzy przykładowe dni — zadania działaniowe (na elementach aplikacji)

Każde zadanie ma `task_type`, `target_ref` (JSONB z parametrami) i `verification_mode = 'auto'`. CRON+triggery weryfikują na podstawie zdarzeń w aplikacji, nie tylko opisu.

**Dzień 1 — Start i pierwsze działanie**
1. `video_watch` — obejrzyj wideo powitalne (admin wskazuje `healthy_knowledge` lub `knowledge_resources` ID).
   `target_ref: { source: 'healthy_knowledge', resource_id: '...', required_seconds: 180 }`
   Weryfikacja: progress w `useVideoProgress` zapisuje `evidence.watched_seconds`; CRON oznacza zaliczone gdy `watched_seconds >= required_seconds`.
2. `resource_view` — przeczytaj konkretny zasób z bazy wiedzy.
   `target_ref: { resource_id: '...' }`
   Weryfikacja: wpis w `user_activity_log` z `action_type='resource_view'` i pasującym `resource_id` po `accepted_terms_at`.
3. `manual_confirm` — wypełnij swój profil do 100% (sprawdzane przez `useProfileCompletion`).
   `target_ref: { check: 'profile_completion_100' }`

**Dzień 2 — Sieć kontaktów**
1. `external_action: add_team_contacts` — dodaj 5 nowych kontaktów prywatnych w CRM.
   `target_ref: { check: 'team_contacts_added', count: 5, since: 'start_date' }`
   Weryfikacja: `SELECT COUNT(*) FROM team_contacts WHERE owner_id = uid AND created_at >= participant.start_date`.
2. `external_action: share_resource` — wygeneruj link do udostępnienia wybranego wideo z bazy wiedzy i wyślij go do min. 10 osób (np. przez wewnętrzny czat / kontakty).
   `target_ref: { check: 'shared_resource_recipients', resource_id: '...', min_recipients: 10 }`
   Weryfikacja: logujemy każde wysłanie do `challenge_activity_log` (`action='share_send'`, `evidence={resource_id, recipient_id}`), CRON sumuje unikalnych odbiorców.
3. `button_click` — wejdź w zakładkę „Akademia" i otwórz konkretną lekcję.
   `target_ref: { check: 'training_lesson_opened', lesson_id: '...' }`
   Weryfikacja: `user_activity_log` z `action_type='training_module_start'` i pasującym `lesson_id`.

**Dzień 3 — Aktywność i nauka**
1. `training_lesson` — ukończ wskazaną lekcję „Szybkiego Startu" (jeśli już ukończona — auto-zalicza się od razu z `training_progress`).
   `target_ref: { lesson_id: '...' }`
2. `external_action: send_messages` — wyślij wiadomość do 3 nowych osób w komunikatorze (DM).
   `target_ref: { check: 'new_dm_threads', count: 3, since: 'start_date' }`
   Weryfikacja: `private_chat_threads` utworzone przez uczestnika po `start_date`, gdzie druga osoba nie miała wcześniej z nim wątku.
3. `link_visit` — odwiedź konkretną stronę CMS / partnera.
   `target_ref: { check: 'page_view', page_path: '/...' }`
   Weryfikacja: `user_activity_log` z `action_type='page_view'` i `page_path` po `start_date`.

Wszystkie 9 zadań dodajemy seedem przez `supabase--insert` (admin może je później edytować w panelu).

---

### 3. CRON nadzorujący (`challenge-daily-supervisor`)

Edge function `supabase/functions/challenge-daily-supervisor/index.ts` + `pg_cron` co godzinę (dla szybkiej weryfikacji aktywności) + dodatkowy daily o 06:00 Warszawa do rolowania dni.

Logika per aktywny uczestnik:

1. **Roluj dzień** — `calculate_challenge_day(participant_id)` z uwzględnieniem `excluded_weekdays` / `excluded_dates` (globalne + per uczestnik).
2. **Auto-weryfikuj zadania** dla wszystkich dni `<= current_day`, które nie mają jeszcze `challenge_task_completions` z `verification_status='verified'`:
   - `video_watch`: `evidence.watched_seconds >= required_seconds`.
   - `resource_view` / `page_view` / `button_click` / `link_visit`: query do `user_activity_log` po `participant.start_date`.
   - `training_lesson`: `training_progress.completed = true` dla danej lekcji.
   - `external_action: team_contacts_added`: COUNT z `team_contacts WHERE owner_id = uid AND created_at >= start_date >= count`.
   - `external_action: shared_resource_recipients`: COUNT DISTINCT recipient z `challenge_activity_log` (action='share_send').
   - `external_action: new_dm_threads`: COUNT nowych unikalnych wątków `private_chat_threads`.
   - `manual_confirm: profile_completion_100`: query do profilu.
3. **Punkty i streak** — gdy wszystkie `required_to_advance=true` zadania danego dnia są `verified`, `current_streak += 1`, w przeciwnym razie reset do 0, aktualizacja `longest_streak`, sumowanie `points_awarded` do `total_points`.
4. **Zakończenie** — gdy `current_day > duration_days`, `status='completed'`, `completion_date=now()`.
5. **Log** — wpis do `cron_job_logs`.

CRON harmonogram:
- Co godzinę: tylko auto-weryfikacja zadań (szybki feedback dla użytkownika).
- 06:00 Warszawa (`warsawLocalToUtc`): pełna rolka (dzień + streak + zakończenia).

Tracking po stronie klienta:
- Hook `useChallengeAction(actionKey, evidence)` — wywoływany z odpowiednich miejsc w aplikacji (player wideo, share button, dodanie kontaktu), zapisuje do `challenge_activity_log`. Nie zmienia żadnej istniejącej funkcjonalności — to tylko dodatkowy zapis obok już istniejących.
- Trigger w bazie: na INSERT do `team_contacts` / `private_chat_threads` — dodajemy odpowiedni wpis do `challenge_activity_log` jeśli właściciel jest aktywnym uczestnikiem (nieinwazyjnie, BEFORE/AFTER trigger tylko czyta `challenge_participants`).

---

### 4. Pliki

**Migracja (1 sztuka):**
- Trigger `tg_challenge_track_team_contact` na `team_contacts` (AFTER INSERT) — log do `challenge_activity_log`.
- Trigger `tg_challenge_track_private_thread` na `private_chat_threads` (AFTER INSERT) — log.
- Funkcja `public.challenge_count_action(participant_id, action_key, since, params)` — pomocnicza dla CRONa.
- Rozszerzenie funkcji `calculate_challenge_day` jeśli wymagane.

**Seed (przez `supabase--insert`):**
- `purebox_settings` wiersz `challenge-90`.
- 9 zadań w `challenge_tasks` (Dzień 1–3).
- `cron.schedule` dla CRONa (godzinowy + dzienny).

**Nowe pliki:**
- `supabase/functions/challenge-daily-supervisor/index.ts`
- `src/hooks/useChallengeAction.ts` — pomocniczy tracker akcji.
- `src/components/challenge/TaskCard.tsx` — render zadania per typ z odpowiednim CTA.
- `src/components/challenge/tasks/VideoWatchTask.tsx`, `ResourceViewTask.tsx`, `ExternalActionTask.tsx`, `ManualConfirmTask.tsx`.
- `src/components/challenge/DayTasksList.tsx` — lista dzisiejszych zadań w `ChallengeDashboard`.

**Edycje (minimalne):**
- `src/hooks/usePureBoxVisibility.ts` — dodanie sprawdzenia `has_challenge_access` dla klucza `challenge-90`.
- Komponent rozwijanej listy PureBox w sidebarze — dodanie pozycji „Wyzwanie 90-dniowe" linkującej do `/wyzwanie-90`.
- `src/components/challenge/ChallengeDashboard.tsx` — wpięcie `DayTasksList`.
- (Opcjonalnie) `src/components/video/LazyVideoPlayer` — wywołanie `useChallengeAction('video_watch', { resource_id, watched_seconds })` jeśli wideo jest aktywnym zadaniem uczestnika; **bez zmiany domyślnego zachowania playera dla nie-uczestników**.

---

### 5. Czego NIE robimy w etapie 2

- Powiadomień push o nowym dniu / zaliczeniu (etap 3).
- Edytora zadań w panelu admina (etap 3) — dziś zadania siedzą jako seed; admin może edytować przez SQL lub poczekać na UI.
- Statystyk admina i rankingu uczestników (etap 4).
- Logiki lidera (nadawanie dostępu z UI) — etap 5.

Po akceptacji ruszam od migracji, potem seed, potem edge function + CRON, na końcu frontend.
