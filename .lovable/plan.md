

## Audyt powiadomień — użytkownicy i zaproszeni goście

### Architektura systemu

Trzy niezależne systemy wysyłki:

1. **`process-pending-notifications`** — CRON co 5 min (pg_cron), orchestrator obsługujący: welcome emails, training notifications/reminders, webinar reminders (via `send-bulk-webinar-reminders`), retries, push reminders, contact reminders, post-event thank you
2. **`send-bulk-webinar-reminders`** — worker wywoływany przez orchestrator, obsługuje webinary i szkolenia zespołowe
3. **`send-meeting-reminders`** — osobny CRON co 15 min, obsługuje spotkania indywidualne (private, tripartite, partner_consultation)

---

### 1. OKNA CZASOWE — SPÓJNOŚĆ

Wszystkie 3 systemy używają tych samych okien:
| Typ | Min–Max (min) | Szerokość | Zgodne? |
|-----|-------------|-----------|---------|
| 24h | 1420–1460 | 40 min | OK |
| 12h | 700–740 | 40 min | OK |
| 2h | 110–130 | 20 min | OK |
| 1h | 50–70 | 20 min | OK |
| 15min | 10–20 | 10 min | OK |

**Wynik: Okna są ujednolicone.** Poprzedni problem z szerszymi oknami w meetings został naprawiony.

---

### 2. CRON INTERWAŁY vs OKNA — RYZYKO POMINIĘCIA

| System | Interwał CRON | Najwęższe okno |
|--------|-------------|---------------|
| `process-pending-notifications` | 5 min | 10 min (15min window) |
| `send-meeting-reminders` | **15 min** | **10 min (15min window)** |

**PROBLEM KRYTYCZNY #1**: `send-meeting-reminders` z CRON co 15 minut vs okno 15min o szerokości 10 minut (10–20 min). Przy interwale 15 min istnieje ryzyko, że CRON uruchomi się np. w minucie 9 (za wcześnie) i następny raz w minucie 24 (za późno) — pomijając całe okno. Przy 5-minutowym interwale to okno jest zawsze trafiane (co najmniej 2 razy). **Spotkania indywidualne mogą nie otrzymać przypomnienia 15-minutowego.**

**Rekomendacja**: Zmienić CRON `send-meeting-reminders` z `*/15` na `*/5` minut.

---

### 3. PROSPECT (TRIPARTITE) — BRAK LINKU W 1h REMINDERZE

W `send-meeting-reminders` linia 477:
```typescript
zoom_link: (reminderType === '2h' || reminderType === '15min') ? meeting.zoom_link : undefined,
```

**PROBLEM #2**: Prospect w spotkaniu trójstronnym **nie otrzymuje zoom_link przy przypomnieniu 1h**. Linia przekazuje link tylko dla `2h` i `15min`. Tymczasem dla gości (guest tokens) link jest dołączany od `2h`:
```typescript
const includeLink = reminderType === '2h' || reminderType === '1h' || reminderType === '15min';
```

**Niespójność**: Goście WebRTC dostają link od 2h/1h/15min. Prospect dostaje link tylko przy 2h i 15min. **Prospect nie otrzyma linku w 1h reminderze.**

Rekomendacja: Zmienić warunek na `(reminderType === '2h' || reminderType === '1h' || reminderType === '15min')`.

---

### 4. PROSPECT — BRAK SZABLONU HTML DLA 1h

W `send-prospect-meeting-email` → `buildProspectEmailHtml()` — brak case `'1h'` w switch/case. Jeśli prospect otrzyma reminder 1h, treść emaila będzie **pusta** (domyślny pusty `content`).

**PROBLEM #3**: Brak szablonu HTML dla przypomnienia 1h w wiadomościach do prospektów. Również brak mapowania `'1h'` w `subjectMap` — subject będzie generycznym fallbackiem.

Rekomendacja: Dodać case `'1h'` w `buildProspectEmailHtml()` oraz wpis w `subjectMap`.

---

### 5. DEDUPLIKACJA — POPRAWNA

| System | Tabela | Klucz | Wynik |
|--------|--------|-------|-------|
| Webinary (goście+users) | `occurrence_reminders_sent` | event_id + occ_index + email + type + occ_datetime | OK |
| Meetings (zarejestrowani) | `meeting_reminders_sent` | event_id + user_id + reminder_type | OK |
| Meetings (prospects) | `meeting_reminders_sent` | event_id + prospect_email + `prospect_{type}` | OK |
| Meetings (goście WebRTC) | `meeting_reminders_sent` | event_id + prospect_email + `guest_{type}` | OK |
| Push reminders | `event_push_reminders_sent` | event_id + user_id + reminder_minutes + stale reset (25h) | OK |

**Brak ryzyka duplikatów.**

---

### 6. TIMEOUT PROTECTION

| Funkcja | Mechanizm | Limit |
|---------|-----------|-------|
| `process-pending-notifications` | `isTimeoutApproaching()` | 55s z 60s |
| `send-meeting-reminders` | `isTimeoutApproaching()` | 50s z 60s |
| `send-bulk-webinar-reminders` | Brak | — |

**Obserwacja**: `send-bulk-webinar-reminders` nie ma timeout protection, ale stosuje batching (BATCH_SIZE=25 z `Promise.allSettled`), co jest wystarczająco szybkie.

---

### 7. LINK DELIVERY — KTO CO DOSTAJE

| Typ | 24h | 12h | 2h | 1h | 15min |
|-----|-----|-----|-----|-----|-------|
| Webinar users (zoom) | — | — | zoom | zoom | zoom |
| Webinar guests (zoom) | — | — | zoom | zoom | zoom |
| Meeting users (zoom) | — | — | zoom | zoom | zoom |
| Meeting guests WebRTC | — | — | room_link | room_link | room_link |
| Meeting prospect (zoom) | — | — | zoom | **BRAK** | zoom |

**Problem #2 powtórzony**: Prospect w 1h nie dostaje linku.

---

### 8. WIELOKANAŁOWOŚĆ — EMAIL + PUSH + IN-APP

| System | Email | Push | In-app |
|--------|-------|------|--------|
| Webinar reminders (users) | tak | — | — |
| Webinar reminders (guests) | tak | — | — |
| Meeting reminders (users) | tak | tak | tak |
| Meeting reminders (prospects) | tak | — | — |
| Meeting reminders (guests WebRTC) | tak | — | — |
| Push reminders (events) | — | tak | — |
| Contact reminders | — | tak | tak + email |
| Welcome emails | tak | — | — |
| Training notifications | tak | tak | — |
| Post-event thank you | tak | — | — |

**Obserwacja**: Webinar reminders nie generują in-app powiadomień ani push — użytkownicy polegają wyłącznie na emailach. Spotkania indywidualne mają pełny zestaw (email + push + in-app).

---

### 9. WEBINAR GUEST FILTERING — BRAK FILTRA OCCURRENCE DLA GOŚCI

W `send-bulk-webinar-reminders` linie 393-397:
```typescript
const { data: guests } = await supabase
  .from("guest_event_registrations")
  .select("id, email, first_name, last_name")
  .eq("event_id", event_id)
  .eq("status", "registered");
```

**PROBLEM #4**: Goście webinarowi **nie są filtrowani po occurrence_index**. W wydarzeniu cyklicznym (np. 3 terminy) gość zapisany na termin 1 **otrzyma przypomnienie także o terminie 2 i 3** — jeśli się na nie nie zapisywał.

Porównanie z użytkownikami (linie 416-439) — tam filtrowanie po `occurrence_date`/`occurrence_time` jest poprawne.

Rekomendacja: Dodać filtrowanie gości po occurrence (jeśli tabela `guest_event_registrations` ma kolumnę occurrence_index/date).

---

### 10. POST-EVENT EMAILS — ANALIZA

- Wysyłane tylko do gości (nie do users/partners/specialists) — **poprawne**
- Bazuje na `auto_webinar_views.watch_duration_seconds > 0` — **poprawne**
- Deduplikacja via `thank_you_sent` flag — **poprawne**
- Okno 2h po zakończeniu — **poprawne**

---

### 11. CRITICAL EVENT BYPASS — ANALIZA

Orchestrator sprawdza krytyczne okna 1h/15min przed pominięciem cyklu (linie 125-155). Filtruje po `start_time` z tabeli `events`.

**PROBLEM #5**: Filtr nie uwzględnia `occurrence_datetime` wydarzeń cyklicznych. Jeśli `start_time` (bazowy) jest daleko w przeszłości, ale termin cykliczny jest za 15 min, sprawdzenie krytyczności go nie złapie, bo porównuje `start_time`, nie rozwinięte occurrences.

Rekomendacja: Rozszerzyć critical event check o parsowanie occurrences lub dodać dedykowane zapytanie.

---

### PODSUMOWANIE ZNALEZIONYCH PROBLEMÓW

| # | Priorytet | Problem | Wpływ |
|---|-----------|---------|-------|
| 1 | **KRYTYCZNY** | CRON spotkań co 15 min vs okno 15min (10 min szerokości) | Spotkania indywidualne mogą nie otrzymać reminder 15min |
| 2 | **WYSOKI** | Prospect nie dostaje zoom_link w 1h reminderze | Prospect bez linku na godzinę przed spotkaniem |
| 3 | **WYSOKI** | Brak szablonu HTML i subjectu dla prospect 1h | Pusty email dla prospect przy 1h |
| 4 | **ŚREDNI** | Goście webinarowi nie filtrowani po occurrence | Goście mogą dostać remindery o terminach, na które się nie zapisali |
| 5 | **NISKI** | Critical event bypass nie uwzględnia occurrences cyklicznych | Teoretycznie pominięty cykl — w praktyce mało prawdopodobne z 5min interwałem |

### BEZ PROBLEMÓW
- Deduplikacja — solidna we wszystkich systemach
- DST — poprawnie obsłużone (`warsawLocalToUtc`)
- Timeout protection — obecne w orchestratorze i meetings
- Batching webinarów — wydajne (25 równolegle, 3 termy naraz)
- Logowanie emaili — kompletne w `email_logs`
- Meeting users — pełny zestaw (email + push + in-app)

### REKOMENDOWANE POPRAWKI

1. **Zmienić CRON spotkań z `*/15` na `*/5`** — eliminuje ryzyko pominięcia okna 15min
2. **Dodać zoom_link do prospect 1h** — zmiana jednej linii w `send-meeting-reminders`
3. **Dodać case '1h' i subject mapping** w `send-prospect-meeting-email`
4. **Dodać filtrowanie gości po occurrence** w `send-bulk-webinar-reminders`
5. (Opcjonalnie) Rozszerzyć critical event bypass o occurrences

