

## Plan: Wysłanie testowego e-maila przypomnienia

### Co zrobimy

Wywołamy edge function `send-bulk-webinar-reminders` z parametrem `test_emails: ["sebastiansnopek87@gmail.com"]` dla wydarzenia TEAM MEETING (ID: `e3363eaf-7c85-493a-aec0-c1faa276df9e`), z `reminder_type: "2h"` (żeby użyć szablonu z linkiem i sprawdzić formatowanie godziny 20:00).

### Szczegóły techniczne

Jedno wywołanie `supabase--curl_edge_functions`:
- **path**: `send-bulk-webinar-reminders`
- **method**: POST
- **body**: `{ "event_id": "e3363eaf-7c85-493a-aec0-c1faa276df9e", "reminder_type": "2h", "occurrence_index": 0, "test_emails": ["sebastiansnopek87@gmail.com"] }`

Funkcja w trybie testowym (`test_emails` podane) filtruje odbiorców do podanych adresów i pomija zapis do `occurrence_reminders_sent`, więc nie zablokuje późniejszej prawdziwej wysyłki.

### Oczekiwany wynik

E-mail z przypomnieniem 2h powinien zawierać godzinę **20:00 (Warsaw)** — jeśli tak, to DST fix działa poprawnie.

### Pliki do zmiany

Brak — tylko wywołanie istniejącej edge function.

