## Problem

1. **Gość PLC `sebastiansnopek87+002@gmail.com` dostał grupowe przypomnienie o 3 modułach szkoleniowych z Akademii**, mimo że nie został jeszcze zatwierdzony przez admina i nie ma dostępu do Akademii. Powód: trigger `assign_training_modules_on_role_insert` przypisuje gościowi WSZYSTKIE moduły z flagą `visible_to_everyone = true`. Cron `process-pending-notifications` widzi te przypisania i wysyła e-mail przez `send-training-reminder-grouped` — nie sprawdzając roli odbiorcy.

2. **Brak globalnej zasady izolacji powiadomień dla roli `guest`** — żadna funkcja wysyłkowa (training, knowledge, banners itd.) nie weryfikuje, czy odbiorca jest gościem i czy ma dostęp do danego modułu.

3. **Brak czytelnego komunikatu przy próbie rejestracji na e-mail, który już istnieje** (np. niezatwierdzony stary rekord). `guest-redeem-invite` zwraca `email_exists` tylko gdy Supabase Auth ma wpis — ale jeśli istnieje sierota w `profiles` bez `auth.users` (lub odwrotnie), komunikat nie kieruje użytkownika do administratora.

## Plan naprawy

### 1. Migracja DB — wykluczenie gości z auto-przypisywania szkoleń

Zaktualizować dwa triggery z `20260121101247`:

- `assign_training_modules_on_role_insert` — dodać warunek `NEW.role <> 'guest'` zanim cokolwiek przypisze. Gość dostaje moduły **wyłącznie** przez ręczne przypisanie przez admina (z poziomu panelu `TrainingManagement`).
- `assign_training_module_to_users` — w klauzuli SELECT pominąć `ur.role = 'guest'`, by nowy moduł z `visible_to_everyone` nigdy nie był auto-przypisany gościom.

Jednorazowy cleanup:

```sql
DELETE FROM training_assignments ta
USING user_roles ur
WHERE ta.user_id = ur.user_id
  AND ur.role = 'guest'
  AND ta.assigned_by IS NULL;          -- tylko auto-przypisane
```

Analogicznie dla innych globalnych mechanizmów wysyłających powiadomienia/emaile masowe:
- `user_dismissed_banners` / `app_banners` — gość ignorowany w cronach przypomnień (filtr po roli w cronie).
- `news_hub` — już jest izolacja per-rola, tylko zweryfikować.

### 2. Edge functions — bramka roli `guest` w wysyłkach

Dodać w każdym z poniższych jednolitą funkcję `canSendToUser(userId, module)`:

- `send-training-reminder-grouped`
- `send-training-reminder`
- `send-training-notification`

Logika:
```
1. pobierz rolę z user_roles
2. jeśli rola = 'guest':
     - sprawdź czy istnieje wpis w training_assignments z assigned_by IS NOT NULL
       (czyli admin ręcznie przypisał)
     - jeśli nie → przerwij wysyłkę, oznacz notification_sent=true (żeby cron nie próbował ponownie), zwróć skip
```

W `process-pending-notifications`:
- przy iteracji `trainingsWithoutNotification` i `remindersDue` — filtrować po roli `guest` po stronie SQL (zaktualizować funkcje RPC `get_training_assignments_without_notification` i `get_training_reminders_due`, by JOIN-owały `user_roles` i wykluczały gości bez explicit `assigned_by`).

### 3. Generalna zasada izolacji gościa

W `process-pending-notifications` na początku każdej sekcji (webinar reminders, training, knowledge, daily signals) dodać helper `isGuestRestricted(userId)`. Gość PLC otrzymuje wyłącznie maile:
- aktywacja konta (`activate-email`)
- zatwierdzenie przez admina (`send-approval-email` typu `admin`)
- powiadomienia o modułach przypisanych mu ręcznie przez admina

Wszystkie inne kanały (newsletter, banery, signals, webinary, knowledge, training z auto-przypisania) — pomijają rolę `guest`.

### 4. Komunikat o sierocym e-mailu w `guest-redeem-invite`

Przed `auth.admin.createUser`:

1. Sprawdzić `auth.users` przez `admin.auth.admin.listUsers({ filter: email })` — jeśli istnieje → zwrócić nowy kod `email_exists_contact_admin` z komunikatem:
   > „Adres e-mail jest już zarejestrowany w systemie. Skontaktuj się z administratorem, aby odzyskać dostęp lub usunąć stare konto."
2. Sprawdzić `profiles` po `email` — jeśli istnieje wpis bez odpowiadającego `auth.users` (sierota) → ten sam komunikat.

Zaktualizować mapę `MESSAGES` i `GuestRegister.tsx`, by ten kod renderował wyraźny banner z linkiem mailto do administratora (z `page_settings.support_email` jeśli dostępny).

Dodatkowy cleanup: jednorazowe zapytanie identyfikujące sieroty (raport tylko do logów):

```sql
SELECT email FROM profiles
WHERE user_id NOT IN (SELECT id FROM auth.users);
-- oraz
SELECT email FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles);
```

(W obecnej bazie sierot nie ma — sprawdzone.)

### 5. Cleanup obecnego gościa

Usunąć 3 błędnie auto-przypisane wpisy `training_assignments` dla `8d8af012-1fe6-463f-be9f-af6f71c108b5` (sebastiansnopek87+002@gmail.com), aby nie dostawał kolejnych przypomnień.

## Szczegóły techniczne

**Pliki do edycji:**
- nowa migracja: triggery + cleanup + zaktualizowane RPC `get_training_assignments_without_notification`, `get_training_reminders_due`
- `supabase/functions/send-training-reminder-grouped/index.ts` — guard roli
- `supabase/functions/send-training-reminder/index.ts` — guard roli
- `supabase/functions/send-training-notification/index.ts` — guard roli
- `supabase/functions/process-pending-notifications/index.ts` — filtr `guest` per-sekcja
- `supabase/functions/guest-redeem-invite/index.ts` — pre-check e-maila + nowy kod błędu
- `src/pages/GuestRegister.tsx` — render komunikatu `email_exists_contact_admin`

**Memory do dodania (po akceptacji):** `mem://features/guest-plc/notification-isolation` — gość PLC nigdy nie otrzymuje powiadomień/maili o modułach, do których nie ma jawnie przyznanego dostępu przez admina.
