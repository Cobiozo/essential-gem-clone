## Problem

Email z danymi do przelewu nigdy nie dochodzi, mimo że w UI widać komunikat "Wysłaliśmy email…". Zamówienia poprawnie zapisują się w bazie (status `awaiting_transfer`), ale wysyłka SMTP cicho nie działa.

## Przyczyna

W funkcji `register-event-transfer-order` jest niezgodność nazwy kolumny SMTP:

- W bazie kolumna nazywa się **`smtp_encryption`** (wartość: `ssl`, port `465`)
- Funkcja czyta natomiast **`s.encryption_type`** (taka właściwość nie istnieje → `undefined`)

Skutkiem tego:

1. Warunek `if (s.encryption_type === "ssl")` jest fałszywy → funkcja otwiera **zwykłe nieszyfrowane TCP** na porcie 465.
2. Cyber-folks na porcie 465 wymaga natychmiastowego TLS — handshake się nie udaje, błąd jest łapany przez `try/catch` wokół wysyłki maila i tylko logowany. Klient już dawno dostał odpowiedź `200 OK` (wysyłka jest w `EdgeRuntime.waitUntil`), więc użytkownik widzi sukces, ale email nigdy nie wychodzi.

Wszystkie inne edge functions (np. `send-bulk-webinar-reminders`, `send-welcome-email`) mapują tę kolumnę poprawnie: `encryption_type: smtpData.smtp_encryption`. Tylko ta jedna funkcja tego nie robi.

## Rozwiązanie

W `supabase/functions/register-event-transfer-order/index.ts`:

1. Po pobraniu `smtp_settings` zmapować poprawnie pole szyfrowania:
   ```ts
   const smtpSettings: SmtpSettings = {
     ...smtp,
     encryption_type: (smtp as any).smtp_encryption,
   };
   ```
   (analogicznie do `send-bulk-webinar-reminders/index.ts` linia 352)

2. Dodać wyraźne logi diagnostyczne w bloku wysyłki maila (host, port, encryption, krok który się wywalił), żeby przyszłe problemy SMTP były widoczne w `edge_function_logs` zamiast cicho ginąć.

3. Po wdrożeniu: ręcznie wywołać ponowną rejestrację testową, sprawdzić skrzynkę odbiorczą oraz logi.

## Pliki do zmiany

- `supabase/functions/register-event-transfer-order/index.ts` — fix mapowania `smtp_encryption` → `encryption_type` + dodanie logów.

Brak zmian w bazie, brak zmian w UI, brak nowych sekretów.
