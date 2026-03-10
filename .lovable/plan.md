

# Plan: Masowa wysyłka emaili przypominających — nowa Edge Function

## Problem

Obecny system (`process-pending-notifications`) wysyła emaile pojedynczo z 1-sekundowym opóźnieniem między nimi, co przy 150+ gościach zajmuje 2-3 minuty i często nie mieści się w timeout. Brak obsługi okien 12h i 2h dla gości webinarów. Brak natychmiastowej wysyłki linku do webinaru dla rejestracji < 15 min przed startem.

## Rozwiązanie

Nowa Edge Function `send-bulk-webinar-reminders` obsługująca:

### 1. Masowa wysyłka — jedno wywołanie = wszystkie emaile

Funkcja przyjmuje `event_id` i automatycznie:
- Pobiera wszystkich zarejestrowanych gości (`guest_event_registrations`, status = `registered`)
- Oblicza czas do startu wydarzenia i dobiera odpowiedni typ przypomnienia
- Wysyła emaile równolegle (batch po 10, bez 1s delay per email)
- Aktualizuje flagi `reminder_*_sent` po każdej wysyłce

### 2. Pięć okien przypominających

| Okno | Szablon | Zawiera link? | Flaga w DB |
|------|---------|---------------|------------|
| 24h | `webinar_reminder_24h` | Nie | `reminder_sent` |
| 12h | `webinar_reminder_12h` | Nie | `reminder_12h_sent` (nowa kolumna) |
| 2h | `webinar_reminder_2h` | Nie | `reminder_2h_sent` (nowa kolumna) |
| 1h | `webinar_reminder_1h` | Tak (zoom_link) | `reminder_1h_sent` |
| 15min | `webinar_reminder_15min` | Tak (zoom_link) | `reminder_15min_sent` |

### 3. Natychmiastowa wysyłka przy rejestracji < 15 min

W `send-webinar-confirmation` dodamy logikę: jeśli do startu wydarzenia pozostało < 15 minut, bezwarunkowo wyślij email z linkiem do webinaru (typ `reminder_15min`) natychmiast po rejestracji.

### 4. CRON — automatyczne wywołanie

Zaktualizowany CRON w `process-pending-notifications` zamiast przetwarzać gości po jednym, wywoła `send-bulk-webinar-reminders` z odpowiednim `event_id` dla każdego wydarzenia w danym oknie czasowym.

## Zmiany w bazie danych (migracja)

```sql
ALTER TABLE guest_event_registrations
  ADD COLUMN IF NOT EXISTS reminder_12h_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_12h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;
```

## Pliki

| Plik | Akcja |
|---|---|
| `supabase/functions/send-bulk-webinar-reminders/index.ts` | **Nowy** — masowa wysyłka per event |
| `supabase/functions/process-pending-notifications/index.ts` | Uproszczenie sekcji 5/5b/5c — delegacja do bulk function + dodanie okien 12h i 2h |
| `supabase/functions/send-webinar-confirmation/index.ts` | Dodanie immediate reminder przy rejestracji < 15 min |
| `supabase/config.toml` | Dodanie `[functions.send-bulk-webinar-reminders]` z `verify_jwt = false` |

## Logika `send-bulk-webinar-reminders`

```text
Input: { event_id, reminder_type?: "24h"|"12h"|"2h"|"1h"|"15min"|"auto" }

1. Pobierz event (title, start_time, zoom_link, host_name)
2. Jeśli reminder_type = "auto": oblicz z różnicy czasu
3. Pobierz gości z guest_event_registrations WHERE event_id AND status='registered' AND odpowiednia flaga = false
4. Pobierz SMTP + szablon
5. Wyślij emaile w batchach po 10 (Promise.allSettled)
6. Aktualizuj flagi + loguj do email_logs
7. Zwróć { sent, failed, skipped }
```

Batch po 10 zamiast sekwencyjnie — 150 gości = ~15 sekund zamiast 2.5 minuty.

