## Plan: rozwijane wiersze uczestników + sidebar statystyk dla uczestnika

### 1. Admin → Uczestnicy → rozwijany wiersz (per użytkownik)
Plik: `src/components/challenge/admin/ParticipantsTable.tsx`

- Każdy wiersz dostaje przycisk „chevron" → po kliknięciu rozwija pełnoszerokościowy panel pod wierszem.
- Panel pobiera:
  - `challenge_tasks` (wszystkie zadania edycji, posortowane po `day`)
  - `challenge_task_completions` dla danego `participant_id` (`task_id`, `status`, `points_awarded`, `verified_at`, `evidence`)
- Render: lista pogrupowana po dniach 1…`current_day` (lub do `duration_days`), każdy dzień ze swoimi zadaniami. Statusy: ✅ zaliczone / ⏳ w trakcie weryfikacji / ❌ brak.
- Per-zadanie 3 akcje (admin):
  1. **Sprawdź teraz** — wywołanie edge `challenge-daily-supervisor` z `{ participant_id, task_id }` (ad-hoc verify, już istnieje); po sukcesie refresh panelu i toast.
  2. **Zalicz ręcznie** — upsert do `challenge_task_completions` (`status='completed'`, `points_awarded=task.points`, `verified_at=now()`, `evidence={manual_by: admin_id}`), potem przelicz `total_points` uczestnika (RPC `challenge_recalc_participant` jeśli jest, inaczej update sumy w JS po refetch).
  3. **Reset zadania** — `delete` z `challenge_task_completions` dla pary participant/task + odjęcie punktów z `challenge_participants.total_points`.
- Wszystkie akcje pod `confirm()` i z toastami; po każdej akcji refetch tylko tego uczestnika.

### 2. Uczestnik → ChallengePage → prawy sidebar „Statystyki"
Plik: `src/pages/ChallengePage.tsx` + nowy `src/components/challenge/ChallengeStatsSidebar.tsx` + hook `src/hooks/useChallengeLiveStats.ts`.

- Layout: na `lg:` siatka `1fr 320px`, sidebar `sticky top-4`. Na mobile sidebar pod kontentem (pojedyncza kolumna), bez zmian wizualnych w samych zadaniach.
- Widoczność: respektuje `challenge_settings.ranking_visible_to_participants` — jeśli false, sidebar pokazuje tylko liczbę uczestników (ranking ukryty).
- Zawartość kart (z odstępem):
  - **Uczestnicy**: `count(challenge_participants WHERE status IN ('active','completed'))`.
  - **Top 5 indywidualnie**: top po `total_points` + nazwiska z `profiles`; podświetlenie wiersza zalogowanego uczestnika.
  - **Top 5 par**: z `challenge_peer_pairs` — sumujemy `total_points` obu uczestników, sortujemy malejąco.
- Hook `useChallengeLiveStats` ładuje raz + subskrypcja realtime na `challenge_participants` (debounce 1s) by liczby/ranking się odświeżały bez reloadu.

### 3. Bez zmian schematu / edge functions
Wykorzystujemy istniejące: `challenge_tasks`, `challenge_task_completions`, `challenge_participants`, `challenge_peer_pairs`, `profiles`, edge `challenge-daily-supervisor` (ad-hoc verify). Brak migracji.

### Pliki
- **Edytowane**: `src/components/challenge/admin/ParticipantsTable.tsx`, `src/pages/ChallengePage.tsx`
- **Nowe**: `src/components/challenge/ChallengeStatsSidebar.tsx`, `src/hooks/useChallengeLiveStats.ts`
