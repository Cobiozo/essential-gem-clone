

## Audyt systemu przypomnień — okna czasowe i paczkowanie

### Architektura (3 funkcje Edge)

1. **`process-pending-notifications`** — CRON orchestrator (co 5 min), wywołuje `send-bulk-webinar-reminders` dla webinarów/szkoleń i `send-meeting-reminders` jest oddzielną funkcją
2. **`send-bulk-webinar-reminders`** — obsługuje webinary i szkolenia zespołowe (z rozwijaniem occurrences)
3. **`send-meeting-reminders`** — obsługuje spotkania indywidualne (meeting_private, tripartite, partner_consultation)

---

### Okna czasowe — spójność

| Typ | process-pending (min) | send-bulk-webinar (min) | send-meeting (min/h) | Zgodne? |
|-----|----------------------|------------------------|---------------------|---------|
| 24h | 1420–1460 | 1420–1460 | 23h–25h (1380–1500) | **NIEZGODNE** — meetings ma szersze okno |
| 12h | 700–740 | 700–740 | 11h–13h (660–780) | **NIEZGODNE** — meetings ma szersze okno |
| 2h | 110–130 | 110–130 | 110–130 | OK |
| 1h | 50–70 | 50–70 | 50–70 | OK |
| 15min | 10–20 | 10–20 | 10–20 | OK |

**Problem 1**: `send-meeting-reminders` używa `hoursUntil >= 23 && <= 25` (=1380–1500 min) i `hoursUntil >= 11 && <= 13` (=660–780 min) zamiast ścisłych okien minutowych. To daje okna 2h szerokie zamiast 40 min. Przy cronie co 5 minut to nie powoduje duplikatów (bo jest dedup), ale jest niespójne z resztą systemu.

**Problem 2**: `send-meeting-reminders` **nie jest wywoływany przez CRON orchestratora** (`process-pending-notifications`). Musi mieć osobny cron job. Sprawdzić czy istnieje w `cron.job`.

---

### Paczkowanie (batching)

| Funkcja | Mechanizm | Rozmiar paczki | Delay |
|---------|-----------|---------------|-------|
| `send-bulk-webinar-reminders` | `Promise.allSettled` na paczce odbiorców | 25 równolegle | Brak (wszystkie naraz) |
| `process-pending-notifications` | terminy w paczkach po 3 równolegle | 3 termy | Brak między paczkami |
| `send-meeting-reminders` | Sekwencyjnie (for loop) | 1 po 1 | Brak |

**Obserwacja**: Bulk webinar sender (BATCH_SIZE=25) jest wydajny. Meeting reminders są sekwencyjne — ok dla spotkań indywidualnych (mało uczestników).

---

### Deduplikacja

| System | Tabela | Klucz |
|--------|--------|-------|
| Webinary/szkolenia | `occurrence_reminders_sent` | event_id + occurrence_index + recipient_email + reminder_type + occurrence_datetime |
| Spotkania (zarejestrowani) | `meeting_reminders_sent` | event_id + user_id + reminder_type |
| Spotkania (prospekty) | `meeting_reminders_sent` | event_id + prospect_email + `prospect_{type}` |
| Spotkania (goście) | `meeting_reminders_sent` | event_id + prospect_email + `guest_{type}` |

Deduplikacja wygląda poprawnie — brak ryzyka duplikatów.

---

### DST (czas letni/zimowy)

- `process-pending-notifications` i `send-bulk-webinar-reminders` — prawidłowo używają `warsawLocalToUtc` z `_shared/timezone-utils.ts`
- `send-meeting-reminders` — nie importuje `warsawLocalToUtc`, ale operuje na `start_time` (które jest w UTC w bazie), formatując wyświetlanie przez `toLocaleDateString('pl-PL', {timeZone: 'Europe/Warsaw'})` — OK

---

### Logowanie emaili

Oba systemy logują do `email_logs` ze statusem `sent`. Bulk webinar dodatkowo aktualizuje legacy flagi w `guest_event_registrations` i `event_registrations`.

---

### Timeout safety

- `process-pending-notifications`: Ma `MAX_EXECUTION_TIME_MS = 55000` z `isTimeoutApproaching()` — OK
- `send-meeting-reminders`: **Brak ochrony przed timeout** — przy dużej liczbie spotkań może przekroczyć 60s limit Edge Function
- `send-bulk-webinar-reminders`: Brak, ale paczki po 25 z Promise.allSettled są szybkie

---

### Critical event bypass

`process-pending-notifications` sprawdza przed pominięciem cyklu, czy są wydarzenia w oknach 1h/15min (linie 125–155). To dotyczy **tylko webinarów** — events z dowolnym `event_type`. Spotkania indywidualne mają osobny cron, więc to nie dotyczy ich.

---

### Podsumowanie znalezionych problemów

1. **Niespójne okna 24h/12h** w `send-meeting-reminders` (2h szerokie vs 40min w reszcie systemu) — do ujednolicenia
2. **Brak timeout protection** w `send-meeting-reminders`
3. **Brak paczkowania** w `send-meeting-reminders` (sekwencyjne wysyłki) — mniejszy priorytet bo spotkania mają 2–3 uczestników
4. Potrzebna weryfikacja osobnego cron joba dla `send-meeting-reminders`

### Bez problemów

- Deduplikacja: poprawna w obu systemach
- DST: poprawnie obsłużone
- Paczkowanie webinarów: BATCH_SIZE=25, termy po 3 — wydajne
- Logowanie: kompletne
- Link delivery w oknach 2h/1h/15min: poprawne (guest meeting link + zoom link)

