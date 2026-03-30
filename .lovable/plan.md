

# AUDYT SYSTEMU POWIADOMIEŃ EMAIL — RAPORT KOŃCOWY

## ARCHITEKTURA SYSTEMU

System składa się z 3 niezależnych procesów CRON + 6 funkcji Edge (workerów) + 2 tabel deduplikacji + logowania do `email_logs`.

```text
┌─────────────────────────────────────────────────────────────┐
│                    pg_cron (co 5 min)                       │
├──────────────────────────────┬──────────────────────────────┤
│  process-pending-            │  send-meeting-reminders      │
│  notifications               │  (osobny cron */5)           │
│  (orchestrator)              │                              │
├──────────────────────────────┤  Obsługuje:                  │
│  Wywołuje:                   │  • meeting_private           │
│  • send-welcome-email        │  • tripartite_meeting        │
│  • send-training-notification│  • partner_consultation      │
│  • send-training-reminder    │                              │
│  • retry-failed-email        │  Wywołuje:                   │
│  • send-bulk-webinar-        │  • send-prospect-meeting-    │
│    reminders (worker)        │    email                     │
│  • send-push-notification    │  • send-push-notification    │
│  • send-notification-email   │                              │
│  • send-post-event-thank-you │                              │
└──────────────────────────────┴──────────────────────────────┘
```

## CRON JOBY (zweryfikowane w bazie)

| Job | Schedule | Status |
|-----|----------|--------|
| `process-pending-notifications` | `*/5 * * * *` | OK |
| `send-meeting-reminders-every-5min` | `*/5 * * * *` | OK (zmieniony z */15) |
| `cleanup-stale-meeting-participants` | `0 * * * *` | OK |
| `cleanup-old-meeting-chat` | `0 3 * * *` | OK |

Oba crony powiadomień działają co 5 min — **spójne i bezpieczne**.

## OKNA CZASOWE — PEŁNA SPÓJNOŚĆ

| Typ | Min–Max (min) | Szerokość | Orchestrator | Bulk Webinar | Meetings |
|-----|-------------|-----------|-------------|-------------|----------|
| 24h | 1420–1460 | 40 min | OK | OK | OK |
| 12h | 700–740 | 40 min | OK | OK | OK |
| 2h | 110–130 | 20 min | OK | OK | OK |
| 1h | 50–70 | 20 min | OK | OK | OK |
| 15min | 10–20 | 10 min | OK | OK | OK |

**Wynik: Wszystkie okna są ujednolicone we wszystkich 3 systemach.** Przy cronie co 5 min, każde okno jest trafiane minimum 2 razy (najwęższe 10min / 5min = 2x).

## DEDUPLIKACJA — POPRAWNA

| System | Tabela | Klucz unikalny |
|--------|--------|----------------|
| Webinary/szkolenia (goście+users) | `occurrence_reminders_sent` | event_id + occ_index + email + type + occ_datetime |
| Meetings (zarejestrowani) | `meeting_reminders_sent` | event_id + user_id + reminder_type |
| Meetings (prospects) | `meeting_reminders_sent` | event_id + prospect_email + `prospect_{type}` |
| Meetings (goście WebRTC) | `meeting_reminders_sent` | event_id + prospect_email + `guest_{type}` |
| Push reminders | `event_push_reminders_sent` | event_id + user_id + reminder_minutes (z resetem 25h) |

**Brak ryzyka duplikatów we wszystkich systemach.**

## KTO CO DOSTAJE — KOMPLETNA MATRYCA

### Webinary / Szkolenia zespołowe (`send-bulk-webinar-reminders`)

| Odbiorca | 24h | 12h | 2h | 1h | 15min | Kanały |
|----------|-----|-----|-----|-----|-------|--------|
| Zarejestrowani użytkownicy | email | email | email+link | email+link | email+link | Email |
| Zaproszeni goście (guest_event_registrations) | email | email | email+link | email+link | email+link | Email |

- Goście filtrowanie po `occurrence_index` w wydarzeniach cyklicznych — **poprawne**
- Użytkownicy filtrowanie po `occurrence_date` + `occurrence_time` (stabilne) — **poprawne**
- Fallback: brak szablonu → generowany HTML z brandingiem Pure Life
- Admini powiadamiani o brakujących linkach

### Spotkania indywidualne (`send-meeting-reminders`)

| Odbiorca | 24h | 12h | 2h | 1h | 15min | Kanały |
|----------|-----|-----|-----|-----|-------|--------|
| Zarejestrowani użytkownicy | email | email | email+zoom | email+zoom | email+zoom | Email + Push + In-app |
| Prospect (tripartite) | email | email | email+zoom | email+zoom | email+zoom | Email |
| Gość WebRTC (meeting_guest_tokens) | email | email | email+room_link | email+room_link | email+room_link | Email |

- Prospect zoom_link dostępny od 2h (w tym 1h) — **poprawione i sprawne**
- Prospect ma pełne szablony HTML dla wszystkich 6 typów (booking, 24h, 12h, 2h, 1h, 15min) — **sprawne**

### Inne powiadomienia (orchestrator)

| Typ | Wyzwalacz | Kanały |
|-----|-----------|--------|
| Welcome email | Nowy użytkownik bez welcome | Email |
| Training assignment | Nowe przypisanie modułu | Email + Push |
| Training reminder | Nieaktywność w szkoleniu | Email + Push |
| Contact reminder | reminder_date <= now() | In-app + Push + Email |
| Post-event thank you | Zakończenie wydarzenia (2h okno) | Email |
| Post-event missed | Gość nieobecny na auto-webinarze | Email |
| Retry failed | Nieudane emaile (max 3 próby) | Email |
| Push reminders | Konfigurowane per-event | Push |

## TIMEOUT PROTECTION

| Funkcja | Mechanizm | Limit |
|---------|-----------|-------|
| `process-pending-notifications` | `isTimeoutApproaching()` | 55s / 60s |
| `send-meeting-reminders` | `isTimeoutApproaching()` | 50s / 60s |
| `send-bulk-webinar-reminders` | BATCH_SIZE=25 + Promise.allSettled | Implicite |

## BATCHING

| Funkcja | Mechanizm | Rozmiar |
|---------|-----------|---------|
| Orchestrator | Termy w paczkach po 3 równolegle | 3 |
| Bulk webinar | Promise.allSettled na odbiorcach | 25 |
| Meetings | Sekwencyjnie | 1 (OK — max 2-3 uczestników) |

## DST (CZAS LETNI/ZIMOWY)

- Orchestrator + Bulk webinar: `warsawLocalToUtc()` z `_shared/timezone-utils.ts` — **poprawne**
- Meeting reminders: operuje na UTC `start_time`, formatuje wyświetlanie z `timeZone: 'Europe/Warsaw'` — **poprawne**

## LOGOWANIE

- Wszystkie emaile logowane do `email_logs` ze statusem `sent`
- Cron jobs logowane do `cron_job_logs` (running → completed/failed)
- `cron_settings` przechowuje `last_run_at` / `next_run_at`

**Ostatnie 24h: 113 emaili sent, 187 cykli CRON completed, 0 failed** — system działa sprawnie.

---

## ZNALEZIONY PROBLEM — BŁĄD W BAZIE

W logach Edge Function widoczny jest **powtarzający się błąd**:

```
[CRON] Error fetching training reminders: {
  code: "42702",
  details: "It could refer to either a PL/pgSQL variable or a table column.",
  message: 'column reference "module_id" is ambiguous'
}
```

**Przyczyna**: Funkcja `get_training_reminders_due()` zawiera subquery:
```sql
SELECT COUNT(*) FROM training_lessons WHERE module_id = ta.module_id
```
Kolumna `module_id` istnieje zarówno w `training_lessons` jak i `training_assignments` (alias `ta`). PostgreSQL nie może jednoznacznie rozwiązać referencji w zagnieżdżonym zapytaniu.

**Wpływ**: Przypomnienia o szkoleniach (`training_reminders`) nigdy nie są wysyłane — każdy cykl CRON loguje ten błąd i pomija krok.

**Naprawa**: Wymaga migracji — pełna kwalifikacja kolumny w subquery:
```sql
WHERE training_lessons.module_id = ta.module_id
```

## NISKI PRIORYTET — CRITICAL EVENT BYPASS

Orchestrator sprawdza krytyczne okna 1h/15min przed pominięciem cyklu (linie 125-155) — ale filtruje po `start_time` z tabeli `events`, nie uwzględniając `occurrences` wydarzeń cyklicznych. W praktyce z `interval_minutes=5` i cronen co 5 min, cykl nigdy nie jest pomijany (interval zawsze minął), więc to nie powoduje problemów. Ale logicznie jest to słaby punkt.

---

## PODSUMOWANIE

| Element | Status |
|---------|--------|
| Okna czasowe | **SPRAWNE** — ujednolicone we wszystkich systemach |
| CRON interwały | **SPRAWNE** — oba co 5 min |
| Deduplikacja | **SPRAWNE** — brak duplikatów |
| Filtrowanie occurrence (goście) | **SPRAWNE** — po occurrence_index |
| Filtrowanie occurrence (users) | **SPRAWNE** — po occurrence_date/time |
| Prospect zoom_link (1h) | **SPRAWNE** — naprawione |
| Prospect szablon HTML (1h) | **SPRAWNE** — dodany |
| Prospect subject (1h) | **SPRAWNE** — dodany |
| DST / timezone | **SPRAWNE** — warsawLocalToUtc |
| Timeout protection | **SPRAWNE** — we wszystkich krytycznych funkcjach |
| Batching | **SPRAWNE** — 25 równolegle dla webinarów |
| Logowanie emaili | **SPRAWNE** — email_logs kompletne |
| Post-event emails | **SPRAWNE** — goście: thank_you / missed_event |
| Push reminders | **SPRAWNE** — konfigurowane per-event |
| **Training reminders** | **NIESPRAWNE** — błąd `module_id is ambiguous` |
| Critical event bypass | **SŁABY PUNKT** — nie uwzględnia occurrences (niski wpływ) |

### Rekomendacja

Jedyny wymagany fix to naprawa funkcji `get_training_reminders_due()` — migracja SQL z pełną kwalifikacją kolumny `module_id`. Reszta systemu jest sprawna i działa bezbłędnie.

