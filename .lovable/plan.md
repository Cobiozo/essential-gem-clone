

# Plan: Reset flag + zabezpieczenie funkcji bulk-reminders

## 1. Reset flag 17 gości którzy dostali przedwcześnie przypomnienia

Użyję insert tool (UPDATE) aby zresetować flagi dla gości z event_id `58aac028...` którzy mają `reminder_sent = true`. To pozwoli CRONowi wysłać im normalne przypomnienia jutro wg harmonogramu.

```sql
UPDATE guest_event_registrations
SET reminder_sent = false, reminder_12h_sent = false, reminder_2h_sent = false,
    reminder_1h_sent = false, reminder_15min_sent = false,
    reminder_sent_at = null, reminder_12h_sent_at = null, reminder_2h_sent_at = null,
    reminder_1h_sent_at = null, reminder_15min_sent_at = null
WHERE event_id = '58aac028-c68f-45c8-9999-d34b5ebb9ced'
AND reminder_sent = true;
```

## 2. Zabezpieczenie `send-bulk-webinar-reminders`

Dodać parametr `test_emails?: string[]` do interfejsu `BulkReminderRequest`:

- Jeśli `test_emails` jest podany i niepusty → filtruj gości po tych emailach, filtruj użytkowników po profilach z tymi emailami
- Jeśli nie podany → działaj jak dotychczas (wysyłaj do wszystkich)
- Dodaj log: `[bulk-reminders] TEST MODE: sending only to X addresses`

Zmiany w pliku `supabase/functions/send-bulk-webinar-reminders/index.ts`:

1. Rozszerzyć `BulkReminderRequest` o `test_emails?: string[]`
2. Po pobraniu gości (linia ~395): jeśli `test_emails`, filtruj `guests` po emailach
3. Po pobraniu użytkowników (linia ~429): jeśli `test_emails`, filtruj `userRecipients` po emailach
4. Dodać log informujący o trybie testowym

## Pliki do zmiany
- `supabase/functions/send-bulk-webinar-reminders/index.ts` — dodanie parametru test_emails + filtrowanie

## Efekt
- Następnym razem gdy wywołam funkcję testowo, podam `test_emails: ["sebastiansnopek87@gmail.com"]` i tylko ten adres dostanie email
- Normalny CRON nie podaje `test_emails`, więc działa bez zmian

