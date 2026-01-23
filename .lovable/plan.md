
# Plan: Powiadomienia email o statusie zatwierdzenia i przypomnienia o szkoleniach

## Cel
Zaimplementować kompletny system powiadomień email dla nowych partnerów, obejmujący:
1. Email przy zatwierdzeniu przez opiekuna (guardian)
2. Email przy zatwierdzeniu przez administratora (pełne zatwierdzenie)
3. Email z przypisanymi szkoleniami po pełnym zatwierdzeniu
4. Przypomnienia o nieukończonych szkoleniach po X dniach braku aktywności

---

## Część 1: Powiadomienia o statusie zatwierdzenia

### 1.1 Nowe szablony email

Utworzyć dwa nowe szablony w tabeli `email_templates`:

**Szablon: `guardian_approval`**
- Nazwa: "Zatwierdzenie przez opiekuna"
- Temat: "Twoja rejestracja została zatwierdzona przez opiekuna! 🎉"
- Treść: Informacja o zatwierdzeniu + info że teraz oczekuje na admina
- Zmienne: `{{imię}}`, `{{nazwisko}}`, `{{guardian_name}}`

**Szablon: `admin_approval`**
- Nazwa: "Pełne zatwierdzenie konta"  
- Temat: "Witamy w Pure Life! Twoje konto jest w pełni aktywne 🌿"
- Treść: Informacja o pełnym zatwierdzeniu + link do logowania + info o przypisanych szkoleniach
- Zmienne: `{{imię}}`, `{{nazwisko}}`, `{{link_logowania}}`, `{{training_modules_list}}`

### 1.2 Nowa Edge Function: `send-approval-email`

Funkcja wysyłająca email przy zmianie statusu zatwierdzenia:

```text
Parametry wejściowe:
- userId: string
- approvalType: 'guardian' | 'admin'
- guardianName?: string (dla guardian approval)

Logika:
1. Pobierz profil użytkownika (email, imię, nazwisko)
2. Pobierz odpowiedni szablon (guardian_approval lub admin_approval)
3. Dla admin_approval: pobierz listę przypisanych modułów szkoleniowych
4. Zastąp zmienne w szablonie
5. Wyślij email przez SMTP
6. Zapisz log do email_logs
```

### 1.3 Modyfikacja funkcji RPC

**`guardian_approve_user`** - dodać wywołanie Edge Function:

```text
Po aktualizacji guardian_approved = true:
1. Wywołaj send-approval-email z approvalType='guardian'
2. Dołącz imię i nazwisko opiekuna (guardianName)
```

**`admin_approve_user`** - dodać wywołanie Edge Function:

```text
Po aktualizacji admin_approved = true:
1. Wywołaj send-approval-email z approvalType='admin'
2. Email zawiera listę przypisanych szkoleń
```

---

## Część 2: Przypomnienia o nieukończonych szkoleniach

### 2.1 Nowa tabela: `training_reminder_settings`

```text
Kolumny:
- id: uuid (PK)
- days_inactive: integer (domyślnie 7)
- reminder_interval_days: integer (domyślnie 7, co ile wysyłać kolejne)
- max_reminders: integer (domyślnie 3, max liczba przypomnień)
- is_enabled: boolean (domyślnie true)
- email_template_id: uuid (FK do email_templates)
- created_at, updated_at
```

### 2.2 Dodanie kolumn do `training_assignments`

```text
Nowe kolumny:
- last_activity_at: timestamp (ostatnia aktywność w module)
- reminder_count: integer (liczba wysłanych przypomnień, domyślnie 0)
- last_reminder_sent_at: timestamp (kiedy wysłano ostatnie przypomnienie)
```

### 2.3 Nowy szablon email: `training_reminder`

- Nazwa: "Przypomnienie o szkoleniu"
- Temat: "Kontynuuj swoje szkolenie: {{module_title}} 📚"
- Treść: Przypomnienie + progress + link do kontynuacji
- Zmienne: `{{imię}}`, `{{module_title}}`, `{{progress_percent}}`, `{{days_inactive}}`, `{{training_url}}`

### 2.4 Nowa Edge Function: `send-training-reminder`

```text
Parametry:
- userId: string
- moduleId: string
- daysInactive: number

Logika:
1. Pobierz profil użytkownika
2. Pobierz moduł szkoleniowy
3. Oblicz postęp (% ukończonych lekcji)
4. Pobierz szablon training_reminder
5. Zastąp zmienne
6. Wyślij email przez SMTP
7. Zapisz log
8. Zaktualizuj reminder_count i last_reminder_sent_at w training_assignments
```

### 2.5 Rozszerzenie `process-pending-notifications`

Dodać nową sekcję w CRON job:

```text
// 7. Process training reminders
1. Pobierz ustawienia z training_reminder_settings (jeśli is_enabled)
2. Znajdź nieukończone training_assignments gdzie:
   - is_completed = false
   - last_activity_at < NOW() - days_inactive dni
   - reminder_count < max_reminders
   - last_reminder_sent_at IS NULL 
     OR last_reminder_sent_at < NOW() - reminder_interval_days dni
3. Dla każdego:
   a. Wywołaj send-training-reminder
   b. Zaktualizuj reminder_count++
   c. Ustaw last_reminder_sent_at = NOW()
```

### 2.6 Nowa funkcja RPC: `get_training_reminders_due`

Funkcja pomocnicza dla CRON:

```text
CREATE FUNCTION get_training_reminders_due()
RETURNS TABLE (
  assignment_id uuid,
  user_id uuid,
  module_id uuid,
  user_email text,
  user_first_name text,
  module_title text,
  days_inactive integer,
  reminder_count integer
)
```

---

## Część 3: Aktualizacja last_activity_at

### 3.1 Trigger na `training_progress`

```text
CREATE TRIGGER update_assignment_activity
AFTER INSERT OR UPDATE ON training_progress
FOR EACH ROW
EXECUTE FUNCTION update_training_assignment_activity()

Funkcja:
- Znajdź module_id przez lesson_id
- Zaktualizuj training_assignments.last_activity_at = NOW()
  dla danego user_id i module_id
```

---

## Część 4: Panel administracyjny

### 4.1 Nowa sekcja w ustawieniach szkoleń

Dodać konfigurację przypomnień:
- Włącz/wyłącz przypomnienia
- Dni nieaktywności przed pierwszym przypomnieniem
- Interwał między kolejnymi przypomnieniami
- Maksymalna liczba przypomnień
- Wybór szablonu email

---

## Kolejność implementacji

1. **Migracja bazy danych**
   - Dodaj szablony email (guardian_approval, admin_approval, training_reminder)
   - Utwórz tabelę training_reminder_settings
   - Dodaj kolumny do training_assignments
   - Utwórz trigger update_assignment_activity
   - Utwórz funkcję RPC get_training_reminders_due

2. **Edge Functions**
   - Utwórz send-approval-email
   - Utwórz send-training-reminder
   - Rozszerz process-pending-notifications

3. **Modyfikacja funkcji RPC**
   - Zaktualizuj guardian_approve_user (trigger email)
   - Zaktualizuj admin_approve_user (trigger email)

4. **Panel administracyjny**
   - Dodaj sekcję konfiguracji przypomnień w TrainingManagement

---

## Sekcja techniczna

### Struktura Edge Function `send-approval-email`

```text
supabase/functions/send-approval-email/index.ts

Interface ApprovalEmailRequest {
  userId: string;
  approvalType: 'guardian' | 'admin';
  guardianName?: string;
}

Flow:
1. Walidacja parametrów
2. Pobranie profilu użytkownika z profiles
3. Pobranie ustawień SMTP z smtp_settings
4. Pobranie szablonu z email_templates (wg internal_name)
5. Dla admin: pobranie modułów z training_assignments + training_modules
6. Podstawienie zmiennych {{...}}
7. Wysyłka przez SMTP (wzorowana na send-training-notification)
8. Logowanie do email_logs
```

### Struktura tabeli `training_reminder_settings`

```sql
CREATE TABLE training_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  days_inactive integer NOT NULL DEFAULT 7,
  reminder_interval_days integer NOT NULL DEFAULT 7,
  max_reminders integer NOT NULL DEFAULT 3,
  is_enabled boolean NOT NULL DEFAULT true,
  email_template_id uuid REFERENCES email_templates(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO training_reminder_settings (days_inactive, reminder_interval_days, max_reminders)
VALUES (7, 7, 3);
```

### Modyfikacja `training_assignments`

```sql
ALTER TABLE training_assignments
ADD COLUMN last_activity_at timestamptz DEFAULT now(),
ADD COLUMN reminder_count integer NOT NULL DEFAULT 0,
ADD COLUMN last_reminder_sent_at timestamptz;
```

### Trigger aktualizacji aktywności

```sql
CREATE OR REPLACE FUNCTION update_training_assignment_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Get module_id from lesson
  SELECT module_id INTO v_module_id
  FROM training_lessons
  WHERE id = NEW.lesson_id;
  
  -- Update last_activity_at in assignment
  UPDATE training_assignments
  SET last_activity_at = NOW(),
      updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND module_id = v_module_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_assignment_activity
AFTER INSERT OR UPDATE ON training_progress
FOR EACH ROW
EXECUTE FUNCTION update_training_assignment_activity();
```

### Przykładowy flow powiadomień

```text
Partner → Rejestracja → [Oczekiwanie]
           ↓
Opiekun zatwierdza → guardian_approve_user RPC
           ↓
         Email: "Opiekun zatwierdził Twoją rejestrację!"
           ↓
Admin zatwierdza → admin_approve_user RPC  
           ↓
         Email: "Witamy! Konto aktywne + lista szkoleń"
           ↓
Partner zaczyna szkolenie → training_progress zapisuje aktywność
           ↓
[7 dni bez aktywności]
           ↓
CRON: process-pending-notifications
           ↓
         Email: "Kontynuuj szkolenie: Moduł X (45% ukończone)"
           ↓
[Kolejne 7 dni bez aktywności]
           ↓
         Email: "Przypomnienie #2..." (max 3 przypomnienia)
```

---

## Zależności

Brak nowych zależności npm - wszystko wykorzystuje istniejącą infrastrukturę SMTP i szablonów email.

## Szacowany czas implementacji

- Migracje bazy danych: ~30 min
- Edge Functions (2 nowe + modyfikacja 1): ~1.5h
- Modyfikacja RPC: ~30 min
- Panel administracyjny: ~45 min

**Łącznie: ~3-4 godziny**
