## Plan dokończenia modułu Wyzwanie 90 dni

Kontynuujemy implementację peer-verification i dowodów wykonania zadań. Pozostały 3 brakujące elementy:

### 1. Storage bucket `challenge-evidence` (migracja Supabase)
Utworzenie prywatnego bucketu na dowody wykonania zadań przez `supabase--storage_create_bucket` + migracja RLS:
- Prywatny bucket, limit 10 MB/plik
- Dozwolone typy: PNG, JPEG, WebP, PDF, DOC, DOCX, XLS, XLSX
- Polityki RLS na `storage.objects`:
  - użytkownik widzi/dodaje/usuwa tylko pliki w folderze `{auth.uid()}/...`
  - admin widzi wszystko
  - partner peer widzi pliki swojego sparowanego uczestnika (przez funkcję `challenge_get_peer`)

### 2. Funkcja `challenge_get_peer` + tabela par
Funkcja SECURITY DEFINER zwracająca `user_id` partnera danego użytkownika z `challenge_peer_pairs` (tabela już istnieje wg schematu). Używana w politykach storage i w `PeerReviewInbox`.

### 3. Integracja przycisku „Oglądaj wideo" z lekcją Akademii
Aby admin mógł precyzyjnie wskazać konkretną lekcję sprzedażową:
- W `TaskFormDialog.tsx` dodać selektor lekcji (dropdown `training_modules` → `training_lessons`) dla szablonu „Otwórz lekcję w Akademii"
- Zapis `module_id` + `lesson_id` w `challenge_tasks.action_config` (jsonb)
- W `TaskCard.tsx` przycisk „Oglądaj wideo" → `navigate('/akademia/modul/{module_id}/lekcja/{lesson_id}')` (lub aktualna ścieżka lekcji)
- Po powrocie z lekcji oznaczenie zadania jako wykonane gdy `training_progress.completed_at` jest ustawione dla wybranej lekcji (auto-weryfikacja)

### 4. Detale techniczne

```text
challenge_tasks.action_config (jsonb):
  - type: "academy_lesson" | "external_url" | "file_upload" | "peer_task"
  - module_id: uuid          (dla academy_lesson)
  - lesson_id: uuid          (dla academy_lesson)
  - url: text                (dla external_url)
  - requires_evidence: bool
  - min_evidence_files: int
  - verification_mode: 'auto'|'peer'|'admin_review'|'self_confirm'
```

Kolejność wykonania w build mode:
1. `supabase--storage_create_bucket(name='challenge-evidence', public=false)`
2. `supabase--migration` — polityki RLS na `storage.objects` + funkcja `challenge_get_peer`
3. Edycja `TaskFormDialog.tsx` — dropdown wyboru lekcji
4. Edycja `TaskCard.tsx` — routing do lekcji + auto-weryfikacja po `training_progress`
5. Weryfikacja: uruchomienie Playwright na `/wyzwanie-90` jako admin, dodanie zadania typu „Akademia", kliknięcie „Oglądaj wideo"

### Pytanie do potwierdzenia
Czy auto-weryfikacja po ukończeniu lekcji w Akademii (`training_progress.completed_at`) ma wystarczać, czy dodatkowo wymagać akceptacji partnera peer? Domyślnie założę: lekcja Akademii → auto, chyba że admin ręcznie ustawi `verification_mode = 'peer'`.