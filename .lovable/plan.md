## Cel

1. Dodać **tryb testowy kampanii** — możliwość wysłania zaproszenia „Zapisz się" tylko do wskazanego użytkownika (np. sam admin), bez ruszania reszty bazy.
2. Zmienić logikę kolejnych tur — kolejne wysyłki mają iść do **wszystkich, którzy nadal nie są zapisani**, nawet jeśli otrzymali poprzednią turę. Wykluczamy tylko zapisanych i tych, którzy dostali maila **w tej samej turze/kampanii**.

---

## Zmiany w bazie

Migracja modyfikująca istniejące tabele:

- `event_email_campaigns`:
  - `test_mode boolean not null default false`
  - `test_recipient_user_id uuid null references profiles(user_id)`
- `event_email_recipients`:
  - usunąć `UNIQUE (event_id, user_id)`
  - dodać `UNIQUE (campaign_id, user_id)` — dedup w obrębie jednej tury, nie całego wydarzenia.

Backfill: istniejące wiersze mają `campaign_id` — unique zadziała.

---

## Zmiany w edge function `process-event-email-campaigns`

- Wybór odbiorców:
  - Jeżeli `campaign.test_mode = true` → jedyny kandydat to profil o `user_id = test_recipient_user_id` (aktywny, niezablokowany, z e-mailem). Ignorujemy `event_registrations` i `event_email_recipients` — test ma się zawsze wysłać.
  - W przeciwnym razie: aktywni, niezablokowani, z e-mailem, **NOT registered** (`event_registrations`), **NOT** wysłani **w tej samej kampanii** (`event_email_recipients.campaign_id = camp.id`). Nie filtrujemy już po całym `event_id` — użytkownik, który dostał 1. turę i się nie zapisał, dostanie 2. turę.
- Dedup w obrębie tury zapewnia nowe `UNIQUE (campaign_id, user_id)` — nawet przy retry ta sama tura nie wyśle dwa razy do tej samej osoby.

---

## Zmiany w UI admina (`TeamTrainingForm.tsx`, sekcja „Kampania e-mail")

Dla każdej tury dodać:

- Toggle **„Tryb testowy — wyślij tylko do wskazanego użytkownika"**.
- Gdy włączony: pole wyszukiwarki użytkownika (reużywamy wzorca z `AdminUserSearch` — search po imieniu/nazwisku/e-mailu, `is_active = true`). Wybrany user zapisywany jako `test_recipient_user_id`.
- Wizualne oznaczenie tury testowej (badge „TEST") i licznik odbiorców po wysyłce (powinien być `1`).
- Walidacja przy zapisie: `test_mode = true` wymaga wybranego użytkownika.

---

## Instrukcja krok po kroku dla użytkownika (po wdrożeniu)

1. Wejdź w **Admin → Zdarzenia**, otwórz istniejące wydarzenie (np. „Spotkanie zespołu") lub utwórz nowe.
2. Rozwiń sekcję **„Kampania e-mail: zaproszenie do zapisu"** i włącz toggle „Wyślij zaproszenie".
3. Dodaj nową turę, wybierz tryb **„Natychmiast po utworzeniu"** (lub konkretną datę w przyszłości, jeśli chcesz sprawdzić harmonogram).
4. Włącz toggle **„Tryb testowy"** dla tej tury i w wyszukiwarce wybierz użytkownika, do którego ma pójść mail (np. własne konto admin lub konto testowe).
5. Nadaj etykietę np. „TEST — jan.kowalski@example.com" i zapisz wydarzenie.
6. Poczekaj do 5 minut (CRON) lub wywołaj ręcznie edge function `process-event-email-campaigns` z panelu Supabase → Edge Functions.
7. Sprawdź skrzynkę wybranego użytkownika — powinien dostać dokładnie 1 e-mail „Zapisz się". Status tury w formularzu zmieni się na **sent** z licznikiem `1`.
8. Aby przetestować drugą turę: dodaj kolejną turę (też w trybie testowym z tym samym lub innym userem) i powtórz.

---

## Instrukcja: kolejne tury dla niezalogowanych (produkcyjnie)

Po nowej logice: dodaj kilka tur (np. „Zaproszenie", „Przypomnienie 24h", „Ostatnia szansa 2h"). Każda kolejna tura automatycznie pominie tych, którzy się już zapisali, ale **ponownie napisze** do tych, którzy dostali poprzedni mail i nadal nie kliknęli „Zapisz się".

---

## Pliki do zmiany

- `supabase/migrations/…` — nowa migracja z ALTER TABLE (kolumny + zmiana unique).
- `supabase/functions/process-event-email-campaigns/index.ts` — nowa logika kandydatów.
- `src/components/admin/TeamTrainingForm.tsx` — UI trybu testowego + wyszukiwarki użytkownika.

## Poza zakresem

- Nie zmieniamy szablonu e-maila ani deep-linku.
- Nie dotykamy `paid_events` ani auto-webinarów.