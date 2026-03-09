

# Fix: Ujednolicenie harmonogramu przypomnień (5 okien dla wszystkich)

## Problem

Obecnie zarejestrowane osoby dostają przypomnienia tylko o **24h, 1h, 15min**, a prospekci o **24h, 12h, 2h, 15min**. Użytkownik chce **jednakowy harmonogram** dla wszystkich: **24h, 12h, 2h, 1h, 15min**.

Przyczyny obecnego ograniczenia:
1. **CHECK constraint** na `meeting_reminders_sent` akceptuje tylko `'24h'` i `'1h'` — insert `'15min'`, `'12h'`, `'2h'` się nie zapisuje, więc CRON wysyła duplikaty
2. **Brak szablonów** `meeting_reminder_12h` i `meeting_reminder_2h` w tabeli `email_templates`
3. **Kod** oznacza okna 12h i 2h jako `isProspectOnlyWindow = true` i pomija zarejestrowanych użytkowników

## Plan zmian

### 1. SQL: Naprawić CHECK constraint + dodać unique index dla prospektów

```sql
-- Rozszerzyć dozwolone typy
ALTER TABLE meeting_reminders_sent DROP CONSTRAINT meeting_reminders_sent_reminder_type_check;
ALTER TABLE meeting_reminders_sent ADD CONSTRAINT meeting_reminders_sent_reminder_type_check 
  CHECK (reminder_type = ANY (ARRAY[
    '24h', '12h', '2h', '1h', '15min',
    'prospect_24h', 'prospect_12h', 'prospect_2h', 'prospect_15min'
  ]));

-- Unique index dla prospect deduplication (user_id jest NULL)
CREATE UNIQUE INDEX IF NOT EXISTS meeting_reminders_sent_prospect_unique 
  ON meeting_reminders_sent (event_id, prospect_email, reminder_type) 
  WHERE prospect_email IS NOT NULL;
```

### 2. SQL: Dodać brakujące szablony emailowe (12h i 2h)

Wstawić nowe szablony `meeting_reminder_12h` i `meeting_reminder_2h` do `email_templates` (analogiczne do istniejących, z odpowiednimi tytułami).

### 3. Edge Function: `send-meeting-reminders/index.ts`

- Usunąć `isProspectOnlyWindow` — wszystkie 5 okien obsługują zarówno prospektów jak i zarejestrowanych
- Pobrać szablony `meeting_reminder_12h` i `meeting_reminder_2h` obok istniejących
- Przypisać odpowiedni szablon do każdego okna:
  - 24h → `meeting_reminder_24h`
  - 12h → `meeting_reminder_12h`
  - 2h → `meeting_reminder_2h`  
  - 1h → `meeting_reminder_1h`
  - 15min → `meeting_reminder_15min`
- Push notification labels rozszerzyć o 12h i 2h

### Pliki do edycji:
- **SQL migration** — constraint + index + szablony
- **`supabase/functions/send-meeting-reminders/index.ts`** — usunięcie prospect-only logiki, dodanie nowych szablonów

