

# Analiza i plan naprawy systemu przypomnień kontaktowych

## Znalezione problemy

### Problem 1: Event type `contact_reminder` jest WYŁĄCZONY
W bazie: `is_active = false`, `send_email = false`, `email_template_id = NULL`.

Oznacza to, że:
- **E-mail nigdy się nie wyśle** — `send-notification-email` sprawdza `send_email` i `email_template_id`, oba są puste/false, więc natychmiast zwraca `skipped`
- Event type jest nieaktywny, co może blokować inne funkcje systemu

### Problem 2: Brak ograniczenia godzinowego 10:00-15:00 CET
Cron `process-pending-notifications` odpala się co godzinę (`0 * * * *`). Sekcja 8b przetwarza przypomnienia **o dowolnej porze** — brak warunku sprawdzającego czy aktualny czas CET mieści się w przedziale 10:00-15:00.

### Problem 3: Brak szablonu e-mail dla przypomnień kontaktowych
Nie istnieje szablon e-mail (`email_templates`) powiązany z event type `contact_reminder`, więc nawet po włączeniu `send_email` nie będzie czego wysłać.

---

## Plan naprawy

### 1. Migracja SQL — aktywacja event type i stworzenie szablonu e-mail

- Utworzyć szablon e-mail w tabeli `email_templates` dla przypomnień kontaktowych (treść po polsku: tytuł kontaktu, notatka, data, link do kontaktów)
- Zaktualizować `notification_event_types` WHERE `event_key = 'contact_reminder'`:
  - `is_active = true`
  - `send_email = true`  
  - `email_template_id` = ID nowego szablonu

### 2. Dodanie okna czasowego 10:00-15:00 CET w edge function

W sekcji 8b (`process-pending-notifications/index.ts`) dodać na początku warunek:

```typescript
const nowWarsaw = new Date().toLocaleString("en-US", { timeZone: "Europe/Warsaw" });
const warsawHour = new Date(nowWarsaw).getHours();
if (warsawHour < 10 || warsawHour >= 15) {
  console.log(`[CRON] Contact reminders skipped: outside 10:00-15:00 CET window (current: ${warsawHour}:00)`);
} else {
  // ... existing reminder processing logic
}
```

### 3. Pliki do zmiany
- `supabase/functions/process-pending-notifications/index.ts` — dodanie warunku godzinowego w sekcji 8b
- Migracja SQL — szablon e-mail + aktywacja event type

Żadne zmiany w UI nie są potrzebne.

