## Zakres

Dwie poprawki w wyzwaniu 90-dniowym:

### 1. Reset pojedynczego zadania (admin) — bez wpływu na inne dni

W panelu `Dni i zadania uczestnika` (`ParticipantTasksPanel.tsx`) przycisk **Reset** jest dziś widoczny tylko dla zadań ze statusem `verified`. Zadania `pending` (np. „sprawdz czy ma cos tam" z manualnym confirm) nie da się cofnąć.

Zmiana:
- Przycisk **Reset** zawsze widoczny obok przycisku **Zalicz**, gdy istnieje jakikolwiek wpis w `challenge_task_completions` (status `verified` lub `pending`).
- Reset usuwa TYLKO wiersz `challenge_task_completions` dla `(participant_id, task_id)` — żadne inne zadania, dni ani punkty z innych dni nie są ruszane.
- Po resecie wywołanie `challenge-daily-supervisor` przeliczy `total_points`, `current_streak` i `current_day` tylko dla tego uczestnika (już tak działa).
- Confirm dialog: „Zresetować zaliczenie zadania „X" dla tego dnia? Inne dni i zadania nie zostaną zmienione."
- Dla zadań w pełni nietkniętych (brak rekordu w `challenge_task_completions`) Reset pozostaje ukryty — nic nie ma do cofnięcia.

Brak zmian w schemacie ani edge functions.

### 2. Bucket `challenge-evidence` nie istnieje — uploady dowodów padają

Toast: „Bucket 'challenge-evidence' nie istnieje — utwórz go w Supabase Storage (prywatny)". Bez tego użytkownik nie może dodać pliku do zadania typu `manual_confirm` z wymaganym dowodem (np. „on ocenia → Wyślij partnerowi").

Zmiana — migracja Supabase:
- Utworzyć prywatny bucket `challenge-evidence` (idempotentnie: `insert ... on conflict do nothing`), `file_size_limit = 10485760` (10 MB), `allowed_mime_types` zgodne z `EvidenceUploader` (image/png, image/jpeg, image/webp, pdf, doc, docx, xls, xlsx).
- RLS policies na `storage.objects` dla bucketu `challenge-evidence`:
  - **Uczestnik** może `INSERT`/`SELECT`/`DELETE` własne obiekty — ścieżka `<auth.uid()>/...` (pierwszy segment `name` = `auth.uid()::text`).
  - **Admin** (`has_role(auth.uid(), 'admin')`) ma `SELECT` na wszystkich obiektach bucketu (do podglądu dowodów).
  - Partner do którego wysłano dowód: dostęp jak dziś przez signed URL (7 dni) generowany w `EvidenceUploader` — bez dodatkowej polityki.

Nie zmieniamy kodu `EvidenceUploader.tsx` — błąd zniknie automatycznie po utworzeniu bucketu.

## Pliki

- **Migracja Supabase**: bucket `challenge-evidence` + 4 polityki RLS na `storage.objects`.
- **Edycja**: `src/components/challenge/admin/ParticipantTasksPanel.tsx` — logika widoczności przycisku Reset + treść confirm.

Brak zmian w pozostałych komponentach.
