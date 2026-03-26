

# Plan: Audyt powiadomień + przebudowa rejestracji gości

## 1. Audyt powiadomień — znalezione problemy

### Problem A: Cron filtruje tylko `event_type = 'webinar'`
W `process-pending-notifications/index.ts` (linia 375) zapytanie pobiera tylko `event_type = 'webinar'`. Wydarzenia typu `team_training` i inne NIE otrzymują przypomnień.

**Fix**: Rozszerzyć filtr na `.in("event_type", ["webinar", "team_training"])` w kroku 5.

### Problem B: Reset flag działa poprawnie
Mechanizm resetowania starych flag (threshold 25h) w `send-bulk-webinar-reminders` (linie 398-438) jest prawidłowy. Flagi z poprzedniego tygodnia zostaną zresetowane przed wysyłką.

### Problem C: Brak reset `event_push_reminders_sent` dla cyklicznych
Tabela `event_push_reminders_sent` nie resetuje się dla kolejnych wystąpień cyklicznych wydarzeń — push jest wysyłany tylko raz.

**Fix**: Przed wysyłką push, sprawdzać czy `sent_at` jest starszy niż 25h przed `start_time` — jeśli tak, usunąć stary rekord i wysłać ponownie.

## 2. Przebudowa rejestracji gości

### Obecny stan
- Unique index: `(event_id, email, COALESCE(slot_time, ''))` — blokuje duplikaty
- RPC `register_event_guest`: przy duplikacie zwiększa `registration_attempts`
- Kontakty: auto-webinary tworzą nowy kontakt (bez dedup), standardowe webinary deduplikują po email+phone

### Wymagane zmiany

**A. RPC `register_event_guest`** — usunąć inkrementację `registration_attempts`. Przy duplikacie zwracać `already_registered` BEZ aktualizacji.

**B. Kontakty w `send-webinar-confirmation`** — dla standardowych webinarów również ZAWSZE tworzyć nowy kontakt (jak dla auto-webinarów), z adnotacją o nazwie wydarzenia i dacie. Usunąć deduplikację email+phone.

**C. Kolumna `registration_attempts`** — zostawić w tabeli (nie kasujemy kolumn), ale nie inkrementować jej.

### Pliki do edycji

| Plik | Zmiana |
|---|---|
| `supabase/functions/process-pending-notifications/index.ts` | Filtr `event_type` na `['webinar','team_training']` + reset push reminders |
| `supabase/functions/send-bulk-webinar-reminders/index.ts` | Bez zmian — reset flag OK |
| Migracja SQL | Zaktualizować RPC `register_event_guest` — bez inkrementacji attempts |
| `supabase/functions/send-webinar-confirmation/index.ts` | Kontakty: zawsze nowy wpis (bez dedup email+phone) |

### Szczegóły techniczne

**RPC (migracja)**:
```sql
-- W bloku EXCEPTION WHEN unique_violation:
-- Zamiast UPDATE SET registration_attempts = ... + 1
-- Tylko SELECT registration_attempts i RETURN 'already_registered'
```

**Kontakty (send-webinar-confirmation)**: Blok `else` (linie 338-405) — zastąpić logiką identyczną jak dla auto-webinarów: zawsze INSERT nowy kontakt z `contact_source` zawierającym nazwę wydarzenia i datę.

