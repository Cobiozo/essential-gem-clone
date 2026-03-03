

# Plan: Pełny system przypomnień kontaktowych (in-app + push + email)

## Problem
Formularz kontaktu prywatnego pozwala ustawić `reminder_date` i `reminder_note`, ale żaden mechanizm nie sprawdza tych dat i nie wysyła powiadomień. Dane leżą nieużywane w bazie.

## Rozwiązanie
Dodać nową sekcję w edge function `process-pending-notifications` (analogicznie do istniejących sekcji webinarowych), która:

1. **Pobiera kontakty z wymagalnymi przypomnieniami:**
   ```sql
   SELECT id, user_id, first_name, last_name, reminder_note, reminder_date
   FROM team_contacts
   WHERE reminder_date <= NOW()
     AND (reminder_sent = false OR reminder_sent IS NULL)
     AND is_active = true
     AND reminder_date IS NOT NULL
   ```

2. **Dla każdego rekordu:**
   - Tworzy powiadomienie **in-app** w `user_notifications` (tytuł: "Przypomnienie o kontakcie", treść: notatka lub imię+nazwisko, link: `/my-account?tab=team-contacts`)
   - Wysyła **Web Push** via `send-push-notification`
   - Wysyła **e-mail** via `send-notification-email` (używając event type `contact_reminder` z tabeli `notification_event_types`, który już istnieje)
   - Ustawia `reminder_sent = true` w `team_contacts`

3. **Dodaje tracking do results:**
   ```
   contactReminders: { processed: 0, success: 0, failed: 0 }
   ```

## Plik do zmiany
- `supabase/functions/process-pending-notifications/index.ts` — dodanie sekcji ~60 linii (przed sekcją "9. Update job log"), aktualizacja `results` i podsumowania

## Szczegóły techniczne
- Sekcja wstawiona jako punkt "8b" (po push reminders, przed finalizacją)
- Treść powiadomienia: `"{first_name} {last_name}: {reminder_note}"` lub fallback `"Zaplanowane przypomnienie o kontakcie {first_name} {last_name}"`
- E-mail: wywołanie `send-notification-email` z `event_type_id` pobranym z `notification_event_types` WHERE `event_key = 'contact_reminder'`
- Formatowanie daty przypomnienia w strefie `Europe/Warsaw`
- 1s delay między e-mailami (jak w reszcie systemu)

