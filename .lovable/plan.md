
# Wyzwanie 90-dniowe — pełna autonomiczna weryfikacja + nowe typy zadań

Cel: każde zadanie ma konkretny cel wskazany przez admina (klik → ten sam materiał), realny mechanizm zaliczania (CRON + zdarzenia), możliwość dowodu w pliku/screenie oraz wzajemną kontrolę w parach.

## 1. Precyzyjne wskazywanie celu przez admina (pickery)

W `TaskFormDialog` zastępujemy ręczne pola JSON komponentami-pickerami, dobieranymi do typu zadania:

- **Wideo z Bazy Wiedzy** → `ResourcePicker` (lista z `knowledge_resources` typu video, wyszukiwarka, miniatury) + pole „wymagane sekundy obejrzenia" + opcjonalnie „minimalny % długości" (auto-liczone z `video_progress`).
- **Lekcja Akademii** → `ModuleLessonPicker` (kaskada: moduł → lekcja z `training_modules` / `training_lessons`) + przełącznik „wymagaj ukończenia" vs „wystarczy otwarcie".
- **Zasób PURE / PDF** → `ResourcePicker` filtrowany po typach plikowych z Bazy Wiedzy.
- **Wejdź na podstronę** → `PagePicker` (lista znanych tras z `KNOWN_APP_ROUTES` + opcja własna ścieżka) + min. czas spędzony.
- **Dodaj N kontaktów do CRM** → liczba + okno czasowe (od startu zadania).
- **Wyślij N nowych DM** → liczba + warunek „różni odbiorcy".
- **Udostępnij wideo X osobom** → `ResourcePicker` + liczba odbiorców.
- **Uzupełnij profil 100%** — bez parametrów.
- **Samo-potwierdzenie** — opis + checkbox „wymaga dowodu w pliku".

Każdy picker zapisuje gotowy `target_ref` w bazie, więc na karcie użytkownika przycisk linkuje natychmiast w to samo miejsce (deep link do lekcji/zasobu/strony).

## 2. Nowe typy zadań (rozbudowa modułu)

Dodajemy do enuma typów:

1. **Komentarz / post w Centrum Aktualności** — admin wskazuje konkretny post; CRON liczy wpis w `news_hub_comments` od user_id po `task_started_at`.
2. **Zapisanie się na wydarzenie** — admin wskazuje `event_id` lub `paid_event_id`; weryfikacja przez `event_registrations` / `paid_event_order_attendees`.
3. **Ukończenie testu PureBox / quiz** — wskazanie testu, weryfikacja z `omega_tests` / `purebox_content`.
4. **Pobranie certyfikatu** — z `certificates` po user_id.
5. **Wypełnienie formularza partnerskiego** — `partner_page_forms` submission.
6. **Rezerwacja spotkania z liderem** — `leader_availability` booking.
7. **Wysłanie zaproszenia (reflink)** — wygenerowanie + min. N kliknięć z `reflink_events`.
8. **Quiz w zadaniu** — admin wpisuje pytania (1-5) + poprawne odpowiedzi; user odpowiada w karcie zadania, auto-zalicza po poprawnych.
9. **Zadanie z dowodem plikowym (upload)** — user wgrywa PDF/DOCX/XLSX/PNG/JPG; status = `pending_review`, weryfikuje partner z pary lub admin.
10. **Zadanie wzajemne (peer-pair)** — wykonuje user A, potwierdza user B (i odwrotnie).
11. **Zadanie zewnętrzne (URL + dowód)** — admin podaje link zewnętrzny (np. ankieta Google), user wraca i wgrywa screen.

Wszystkie typy mają w bazie wspólny model `challenge_tasks.target_ref` (JSONB) — bez migracji schematu, tylko nowe `check` codes + obsługa w supervisorze.

## 3. Realna weryfikacja — CRON `challenge-daily-supervisor` (co 15 min)

Dla każdego nowego `check` dodajemy zapytanie w `challenge_count_action`:

- `video_min_seconds`: suma `video_progress.watched_seconds` dla `resource_id` ≥ próg.
- `lesson_completed`: `training_progress.is_completed = true` dla `lesson_id`.
- `lesson_opened`: wpis w `user_activity_log` typu `training_lesson_opened` z `lesson_id`.
- `page_visit_min_seconds`: suma `user_activity_log` dla `page_path` + (opcjonalnie) min. czas (mierzymy `dwell_ms` w hooku).
- `news_hub_comment_on_post`: rekord w `news_hub_comments` dla `post_id` po `task_started_at`.
- `event_registered`: wpis w `event_registrations` / `paid_event_order_attendees`.
- `certificate_downloaded`: log w `user_activity_log` typu `certificate_download`.
- `purebox_test_completed`: rekord z poprawnym wynikiem w `omega_tests`.
- `reflink_clicks_min`: SUM kliknięć z `reflink_events` po `task_started_at`.
- `peer_verified`: completion ma `verification_source='peer'` i partner potwierdził.
- `file_uploaded`: completion ma `evidence.files.length >= N` (auto-verified jeśli `auto_accept=true`, w przeciwnym razie czeka na partnera/admina).

Wszystkie zmiany ograniczone do funkcji SQL `challenge_count_action` + edge function (bez nowych tabel poza poniższymi).

## 4. Dowody plikowe (upload)

- Nowy bucket Storage `challenge-evidence` (private, RLS: user widzi własne, admin/partner z pary — wszystkie z zadania).
- W `TaskCard` dla zadań z `requires_evidence=true` lub typu „upload": komponent `EvidenceUploader` (drag&drop, PDF/DOC/DOCX/XLS/XLSX/PNG/JPG, max 10MB, do 5 plików; pliki >2MB → XHR na VPS zgodnie z konwencją projektu).
- Zapis ścieżek do `challenge_task_completions.evidence.files = [{url, name, mime, size, uploaded_at}]`.
- Status startowy = `pending_review`, badge „Czeka na akceptację partnera/admina".

## 5. Pary kontrolne (peer verification)

Nowa tabela `challenge_peer_pairs`:
- `id, participant_a_id, participant_b_id, team_id (opcjonalnie), created_by (admin), created_at`.

W panelu admina (`ChallengeAdminPage`) nowa zakładka **„Pary kontrolne"**:
- Lista wszystkich uczestników z filtrem po zespole.
- Przycisk „Sparuj wybranych" (zaznaczenie dwóch).
- Auto-suggest: „Sparuj losowo w obrębie zespołu".

UI uczestnika:
- W karcie zadania z `verification_mode='peer'`: po wgraniu dowodu pojawia się sekcja „Twój partner: Jan K." z przyciskiem „Poproś o weryfikację" (push + powiadomienie in-app).
- Partner widzi w swojej zakładce **„Do zatwierdzenia"** listę dowodów partnera; akcje: ✓ Zaliczam / ✗ Odrzucam + komentarz.
- Zatwierdzenie zapisuje `verification_status='verified'`, `verification_source='peer'`, `verified_by=partner_id`.
- Admin zawsze ma override.

## 6. Konfiguracja per-zadanie w adminie

Nowe pola w `TaskFormDialog` (zapisywane do `challenge_tasks`):
- `verification_mode`: `auto` | `self_confirm` | `peer` | `admin_review`.
- `requires_evidence`: bool + min. liczba plików.
- `allowed_file_types`: multiselect.
- `deadline_hours_after_start`: dla zadań z długim oknem (np. 48h).
- `cooldown_minutes`: anty-spam (np. dla DM/kontaktów min. odstęp).

## 7. UI — wskazanie „kliknij w aplikacji" (in-app picker, opcjonalnie etap 2)

Sygnalizujemy w planie jako rozszerzenie: panel admina otwiera mini-iframe z aplikacją; admin klika element → łapiemy `data-challenge-target` najbliższego węzła i wstawiamy do `target_ref`. Zostawiamy jako fazę 2 (najpierw pickery z punktu 1 — pokrywają 95% przypadków deterministycznie i bez ryzyka).

## 8. Schema (jedna migracja)

```text
CREATE TABLE public.challenge_peer_pairs (
  id, participant_a_id FK, participant_b_id FK,
  team_id NULL, created_by, created_at,
  UNIQUE(participant_a_id, participant_b_id)
);
-- GRANT-y, RLS: para widzi siebie nawzajem; admin pełen dostęp.

ALTER TABLE challenge_tasks ADD COLUMN
  verification_mode text DEFAULT 'auto',
  requires_evidence bool DEFAULT false,
  min_evidence_files int DEFAULT 0,
  allowed_file_types text[] DEFAULT '{}',
  deadline_hours_after_start int,
  cooldown_minutes int DEFAULT 0;

ALTER TABLE challenge_task_completions ADD COLUMN
  verified_by uuid,           -- partner lub admin
  reviewer_comment text,
  task_started_at timestamptz; -- moment pierwszego kliknięcia CTA

-- Storage bucket 'challenge-evidence' (private) + policies.
```

## 9. Pliki do dodania / zmiany (techniczne)

- `supabase/migrations/...` — schema + storage bucket.
- `supabase/functions/challenge-daily-supervisor/index.ts` — rozszerzenie `challenge_count_action` o nowe checki.
- `src/components/challenge/admin/TaskFormDialog.tsx` — pickery + nowe pola.
- `src/components/challenge/admin/pickers/{ResourcePicker, ModuleLessonPicker, PagePicker, EventPicker, NewsHubPostPicker}.tsx`.
- `src/components/challenge/admin/PeerPairsTab.tsx` — zarządzanie parami.
- `src/components/challenge/EvidenceUploader.tsx` — upload plików.
- `src/components/challenge/PeerReviewInbox.tsx` — skrzynka „do zatwierdzenia".
- `src/components/challenge/TaskCard.tsx` — render evidence + peer status + quiz.
- `src/types/challenge.ts` — nowe pola.
- `src/hooks/useActivityTracking.ts` — dorzucamy `dwell_ms` dla page_visit_min_seconds.

## 10. Zakres pierwszej iteracji (proponuję start)

Żeby nie przeładować jednej tury, sugeruję wdrożyć w kolejności:

1. **Pickery + deep linki** (lekcja/wideo/zasób/strona) — usuwa problem „przycisk nie prowadzi do konkretnego materiału".
2. **Pary kontrolne + dowody plikowe + peer review** — odblokowuje typy „samo-potwierdzenie" z dowodem.
3. **Nowe checki w CRON** (news_hub_comment, event_registered, certificate_downloaded, reflink_clicks).
4. **Quiz w zadaniu + zadania zewnętrzne**.

Potwierdź, czy lecimy całością czy etapami (sugeruję etap 1+2 razem — to spina obecny problem z linkowaniem i daje realny mechanizm weryfikacji peer).
