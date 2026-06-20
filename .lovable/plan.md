## Cel

Naprawić 4 problemy w wyzwaniu 90-dniowym:
1. **Lekcje Akademii zaliczane w wyzwaniu = osobny tor, niezależny od głównego postępu Akademii** (certyfikaty i historyczne ukończenia pozostają nietknięte).
2. „Udostępnij wideo X osobom" wisi w „Weryfikacja w toku" wiecznie — bo akcja `share_send` **nigdzie nie jest logowana**.
3. Każde zadanie oparte o akcję w aplikacji musi być twardo weryfikowane przez CRON (kliknięcie, wejście, czas pobytu, faktyczne wykonanie po dacie startu).
4. Po prawej stronie panelu admina dodać **Archiwum poprzednich edycji wyzwania**.

---

## 1. Lekcje Akademii w wyzwaniu — osobny tor (kluczowa zmiana koncepcyjna)

### Zasada
- Akademia (zwykły cykl szkolenia) i Wyzwanie 90-dniowe to **dwa odrębne tory**.
- Wejście do lekcji **z poziomu Akademii** → standardowy `training_progress` (certyfikat, status „zaliczone") — bez zmian, bez kolizji.
- Wejście do lekcji **z karty zadania Wyzwania** → odrębny rekord postępu liczony tylko dla tego wyzwania; nie nadpisuje, nie kasuje, nie modyfikuje istniejącego `training_progress`.
- Użytkownik, który ma zaliczone z Akademii, w Akademii nadal widzi „Zaliczone"; w wyzwaniu widzi „Otwórz lekcję" i musi przejść ją od nowa w kontekście wyzwania.

### Zmiany
- **Nowa tabela `challenge_lesson_progress`** (migracja):
  - `participant_id` (FK challenge_participants), `lesson_id` (FK training_lessons), `started_at`, `completed_at`, `dwell_seconds`, `source='challenge'`, unique(participant_id, lesson_id).
  - GRANT authenticated SELECT/INSERT/UPDATE (własne wiersze), service_role ALL.
  - RLS: użytkownik widzi/edytuje tylko swoje przez `participant_id → user_id = auth.uid()`.
- **Klient (TaskCard / nawigacja do `/training/...`)**: wejście z zadania dokleja query `?challenge=1&participant=<id>`.
  - Player lekcji (TrainingLessonPage) wykrywa flagę i:
    - nie wstawia/aktualizuje `training_progress` (lub robi to równolegle, ale traktuje jako „read-only" względem starego zaliczenia — wybór: **całkowicie pomija** zapis do `training_progress`).
    - tworzy/aktualizuje `challenge_lesson_progress` (start, dwell, complete na końcu lekcji).
  - UI w playerze pokazuje wstążkę „Tryb wyzwania 90-dniowego — postęp Akademii nie zostanie zmieniony".
- **Edge supervisor (`verifyTask` → `training_lesson`)**:
  - Zamiast `training_progress` sprawdza `challenge_lesson_progress` dla tego `participant_id` i `lesson_id`, warunek `completed_at IS NOT NULL`.
  - Stary fallback usunięty — historia Akademii nigdy nie zalicza zadania wyzwania.
- **TaskCard `training_lesson`**: CTA „Otwórz lekcję" zawsze aktywne; status „Zaliczone" tylko jeśli istnieje completion w `challenge_lesson_progress`.

### Co zostaje bez zmian
- `training_progress`, certyfikaty, statusy „Ukończone" w Akademii — nietknięte.
- Edge `auto-generate-certificate` — nie reaguje na `challenge_lesson_progress`.

---

## 2. Weryfikacja udostępnień (krytyczna luka)

### Problem
`shared_resource_recipients` w `challenge_count_action` liczy wpisy `challenge_activity_log` z `action_type='share_send'`. **Żaden kod nigdy ich nie wstawia** → wieczne „Weryfikacja w toku".

### Zmiany
- **Utility `src/lib/challengeShareLog.ts`** — `logShareSend({ resourceId, recipientId, channel })`:
  - Znajduje aktywnego `challenge_participants` użytkownika.
  - Insert do `challenge_activity_log` (`action_type='share_send'`, `payload={resource_id, recipient_id, channel}`).
  - Wywołuje supervisora ad-hoc z `participant_id`.
- **Punkty wpięcia (Bazą Wiedzy / player / udostępnienie do CRM / DM / partnera)** — każdy realnie wysłany odbiorca = jeden `logShareSend`.
- **TaskCard `shared_resource_recipients`** → otwiera **nowy `ShareToContactsDialog`** (multi-select z CRM/DM); brak wysłania = brak zaliczenia. Sam klik „Udostępnij link" już nic nie liczy.
- **RPC `challenge_count_action`** — dołożyć filtr `created_at >= participant.start_date`.

---

## 3. Twarda weryfikacja zadań akcyjnych

### Zasady ogólne
- Wszystkie zadania (`video_watch`, `training_lesson`, `resource_view`, `page_view`, `link_visit`, `button_click`, `external_action`) wymagają zdarzenia **po `participant.start_date`**.
- RPC `challenge_count_action`: filtr `start_date` we wszystkich gałęziach (gdzie ma sens).
- `verifyTask` w supervisorze:
  - `video_watch` → istniejące zliczanie + filtr `created_at >= start_date`.
  - `page_view` / `resource_view` → wymagany czas pobytu (`min_dwell_ms`, default 15 000). Klient wysyła `dwell_ms` na unmount/visibilitychange (rozszerzony `useActivityTracking`).
  - `link_visit` / `external_action` → bez `requires_evidence=true` lub `self_confirm` zostają pending (admin może ręcznie zaakceptować).
- **Ad-hoc weryfikacja**: supervisor przyjmuje body `{ participant_id }` i weryfikuje pojedynczego uczestnika (sekundy zamiast 15 min).
- Logi `cron_job_logs`: dorzucamy per-uczestnik detail (co weryfikowane, ile dot. zaliczeń).

---

## 4. Archiwum edycji wyzwania (panel admina, prawa kolumna)

### Założenia
- „Edycja" = okres `global_start_date` → `+ duration_days` z `challenge_settings`.
- Nowa tabela **`challenge_editions_archive`**: `title`, `start_date`, `end_date`, `duration_days`, `participants_count`, `completed_count`, `total_points_awarded`, `top_participants` jsonb, `top_pairs` jsonb, snapshot jsonb. RLS admin-only.
- Edge `challenge-archive-edition` — snapshotuje z `challenge_participants` + `challenge_task_completions` + `challenge_peer_pairs`.
- Komponent `ChallengeArchivePanel` w `ChallengeAdminPage` — sticky prawa kolumna (desktop), accordion (mobile). Klik → drawer ze statystykami: top 10, top 5 par, podium top 3, wykres ukończeń, kwalifikacja.

---

## Sekcja techniczna

### Migracje
- `<ts>_challenge_hardening.sql`:
  - tabela `challenge_lesson_progress` (+ GRANT + RLS),
  - tabela `challenge_editions_archive` (+ GRANT + RLS admin),
  - RPC `challenge_count_action` z filtrem `start_date`,
  - opcjonalna gałąź `challenge_lesson_completed` (z `challenge_lesson_progress`).

### Pliki nowe
- `src/lib/challengeShareLog.ts`
- `src/components/challenge/ShareToContactsDialog.tsx`
- `src/components/challenge/admin/ChallengeArchivePanel.tsx`
- `src/hooks/useChallengeArchive.ts`
- `src/hooks/useChallengeLessonProgress.ts` (zapis startu / dwell / completion w trybie wyzwania)
- `supabase/functions/challenge-archive-edition/index.ts`

### Pliki edytowane
- `supabase/functions/challenge-daily-supervisor/index.ts` — `training_lesson` → `challenge_lesson_progress`; `video_watch` filtr `start_date`; obsługa `participant_id` body.
- `src/components/challenge/TaskCard.tsx` — link do lekcji z `?challenge=1&participant=<id>`; `shared_resource_recipients` → `ShareToContactsDialog`; CTA dla `training_lesson` zawsze aktywne; wysyłka `dwell_ms`.
- `src/pages/TrainingLessonPage` (i/lub komponent playera) — wykrycie `?challenge=1`, zapis do `challenge_lesson_progress` zamiast `training_progress`, wstążka informacyjna.
- `src/hooks/useActivityTracking.ts` — dorzucenie pomiaru dwell (start na mount, flush co 30s + na visibilitychange/unmount).
- Miejsca realnego sharingu (Baza Wiedzy / player / DM share / CRM share) — wpięcie `logShareSend`.
- `src/pages/ChallengeAdminPage.tsx` — grid 2-kolumnowy z `ChallengeArchivePanel` po prawej.

### Założenia domyślne (do potwierdzenia w buildzie, nie blokują)
- Archiwizacja edycji = wyłącznie snapshot; reset aktywnej edycji to osobny przycisk „Wystartuj nową edycję".
- `min_dwell_ms` default 15 000, edytowalne per zadanie w `target_ref.min_dwell_ms`.
- W trybie wyzwania player **całkowicie pomija** zapis do `training_progress` (najczystsza izolacja, brak kolizji z certyfikatami).
