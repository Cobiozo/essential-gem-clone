# ETAP 3.5 — Supabase Load Reduction / Production Stabilization (AUDYT + PLAN, BEZ WYKONANIA)

Stage 6 = PARTIAL / BLOCKED. Stage 7 = NOT STARTED. Nic nie zostało zmienione: żadnego kodu, crona, SQL, commita.

Uwaga metodologiczna: w trakcie tego audytu pooler bazy odpowiadał z przerwami (1 udany odczyt, 4 kolejne `pooler unavailable`). Poniżej rozdzielam **ZMIERZONE** od **DO POBRANIA po stabilizacji**. Nie zgaduję wartości.

## A. Infrastructure / pg_net

ZMIERZONE (2026-09-07 21:39 UTC, po podniesieniu compute):
- połączenia ogółem: 29, active: 3, **idle in transaction: 8**
- `net.http_request_queue`: **0** (było 46 → kolejka pg_net się rozładowała)

DO POBRANIA (jedno okno pomiarowe, gdy pooler stabilny) — to jest zestaw BEFORE:
1. CPU / Compute / Disk IO / Memory z panelu Infrastructure (zrzut wartości, nie screenshot).
2. `pg_stat_statements` top 20 po `total_exec_time` i po `max_exec_time`.
3. `pg_stat_all_tables` dla `net._http_response`, `cron.job_run_details`, `user_notifications`, `profiles`, `training_progress`: rozmiar, n_live_tup, n_dead_tup, last_autovacuum.
4. `pg_stat_activity` — liczba `idle in transaction` i maks. wiek transakcji.
5. Liczba 504 na `/auth/v1/token` i `/rest/v1/*` z edge logs za ostatnie 60 min.

Zakazy respektowane: bez VACUUM FULL, bez TRUNCATE, bez ręcznego kasowania `net.http_request_queue`.

### A1. Retencja `net._http_response` (zgodna z mechanizmem pg_net)
pg_net sam czyści odpowiedzi starsze niż `net.ttl` (domyślnie 6 h) w workerze. Problem nie jest w retencji, tylko w bloacie (97 MB / ~435 live rows) — DELETE skanuje martwą przestrzeń.
- Zmiana: skrócenie TTL pg_net do 1 h (`alter role ... ` / `net.worker_restart()` wg dokumentacji rozszerzenia) + jednorazowy zwykły `VACUUM (ANALYZE) net._http_response`.
- Ryzyko: niskie — odpowiedzi HTTP i tak nie są odczytywane przez aplikację (żadna funkcja nie czyta `net._http_response`).
- Rollback: przywrócenie TTL 6 h.
- Efekt oczekiwany: DELETE cleanup z ~38 min → sekundy; zwolnienie CPU/IO.

### A2. Autovacuum tuning (bez VACUUM FULL)
- `ALTER TABLE net._http_response SET (autovacuum_vacuum_scale_factor=0.01, autovacuum_vacuum_cost_delay=0)`
- to samo dla `cron.job_run_details`.
- Ryzyko: bardzo niskie. Rollback: `RESET`.

## B. Cron — audyt

| Job | Schedule | Calls/dobę | Zapytania DB (z kodu) | Overlap możliwy | Concurrency protection | Ocena |
|---|---|---|---|---|---|---|
| #17 retry-missing-join-links | `*/2` | 720 | 11 `.from()`, główny SELECT `limit 50` | tak | **brak** | tabela `missing_join_link_alerts` = 0 wierszy → praca zerowa, koszt = wpis do `job_run_details`. Kandydat na `*/10`. |
| #7 process-pending-notifications | `*/5` | 288 | **37 `.from()`**, 1414 linii, pętle per-odbiorca | tak | **brak** | najcięższy job; wymaga locka |
| #9 send-meeting-reminders | `*/5` | 288 | 16 `.from()`, **brak jakiegokolwiek `limit`** | tak | **brak** | ryzyko dużych SELECT-ów |
| #16 process-event-email-campaigns | `*/5` | 288 | 15 `.from()`, `limit 5` + **`limit 5000`** | tak | **brak** | `limit 5000` do sprawdzenia |
| #15 challenge-daily-supervisor | `*/15` (mimo nazwy „hourly") | 96 | 12 `.from()`, `limit 100` | tak | **brak** | kadencja do potwierdzenia z logiką wyzwania |
| #5 refresh-google-tokens | `*/30` | 48 | 5 `.from()` | tak | **brak** | OK |

Zbieżność startów: co 10 min zbiegają się #7/#9/#16/#17; co 30 min sześć jobów naraz.

Propozycja (do akceptacji, NIE wykonana):
- rozsunięcie offsetów: #7 `1-59/5`, #9 `2-59/5`, #16 `3-59/5`, #15 `4/15`, #5 `5/30`, #17 `*/10`;
- `pg_try_advisory_lock(<jobid>)` na starcie każdej funkcji + zwolnienie w `finally`;
- zwiększenie interwału TYLKO dla #17 (dowód: 0 wierszy w tabeli źródłowej). Dla pozostałych nie zmieniam kadencji bez danych z `job_run_details`.

## C. `cron.job_run_details` (161 MB, nigdy nie odkurzana, brak indeksu na `start_time`)
Plan (nie wykonany):
1. `CREATE INDEX CONCURRENTLY idx_job_run_details_start_time ON cron.job_run_details (start_time);` (poza migracją, ręcznie).
2. Batch cleanup pętlą po 10 000 wierszy: `DELETE ... WHERE start_time < now() - interval '14 days'` — nigdy jednym strzałem.
3. Retencja 14 dni jako codzienny job o 03:15 (jeden dodatkowy job, kadencja dobowa).
4. `VACUUM (ANALYZE) cron.job_run_details` + autovacuum tuning z A2.
Ryzyko: utrata historii uruchomień starszej niż 14 dni. Rollback: brak potrzeby (dane diagnostyczne).

## D. Frontend → Supabase (zmierzone w kodzie)

- `select('*')`: **282** wystąpienia. Największe skupiska: `AiCompassWidget` (9), `AdminWorkspace` (6), `CMSContentTranslation` (6), `TrainingModule` (5), `useLeaderAvailability` (5), `NotificationSystemManagement` (5).
- `setInterval`: **50** wystąpień w 35 plikach; większość to timery UI (countdowny), nie zapytania.
- Realtime: **33 pliki** z `postgres_changes`.

### TOP 10 mechanizmów wg potencjalnego wpływu
1. **`profiles` w realtime na `event:'*'`** — `UserStatistics`, `PlatformStructureView`, `useOrganizationTree`, `UserWorldMapWidget`. Każda zmiana dowolnego profilu (w tym heartbeat `last_seen`!) rozsyła zdarzenie do wszystkich adminów, a callbacki robią pełny refetch. **P0.**
2. **`useLastSeenUpdater` × realtime `profiles`** — UPDATE co 4 min na użytkownika → mnożnik ruchu realtime z pkt 1. Sam UPDATE jest tani, kosztowna jest konsekwencja. **P0.**
3. **`list_changes` realtime** — z poprzedniego pomiaru 14,5 mln wywołań i 111 844 s łącznego czasu; największy pojedynczy konsument CPU w `pg_stat_statements`. **P0.**
4. **`training_progress` przez PostgREST** — 18 518 wywołań, 22 032 s total, max 5,9 s. **P1.**
5. `select('*')` na tabelach z kolumnami JSONB/HTML (CMS, news hub, partner pages) — transfer. **P1.**
6. `send-meeting-reminders` bez `limit` (backend, ale to zapytania DB). **P1.**
7. `useNotifications` polling 3 min — już activity-aware i visibility-aware; **zostawić**. **P3.**
8. `CombinedOtpCodesWidget` — 3 interwały, dwa 5-sekundowe (countdown, bez DB) + jeden refresh z guardami. Zweryfikować, że 5 s nie wywołuje refetchu. **P2.**
9. `useNotifications` kanał z `Date.now()` w nazwie — przy każdym remount nowy kanał; ryzyko duplikatów subskrypcji. **P1.**
10. Zapytania w komponentach admina montowanych zawsze (np. `SystemHealthAlertsPanel`, `AdminWorkspace`) niezależnie od aktywnej zakładki. **P2.**

## E. Index / query optimization
Nie proponuję ani jednego indeksu bez EXPLAIN. Wymagane BEFORE dla `training_progress` i realtime `list_changes`:
- pełny znormalizowany tekst zapytania z `pg_stat_statements`,
- `EXPLAIN (ANALYZE, BUFFERS)`,
- `pg_indexes` dla tabeli,
- dopiero potem propozycja indeksu + powtórny EXPLAIN.
Do sprawdzenia także Performance/Index Advisor w panelu Supabase (dostępny w Advisors) — jeszcze nie odpytany, bo pooler był niestabilny.

## F. Realtime — mapa (bez wyłączania globalnie)
33 pliki. TOP 5 najkosztowniejszych ścieżek:
1. `UserStatistics` → `profiles` `*` → `schedule()` = refetch statystyk.
2. `PlatformStructureView` → `profiles` + `user_roles` `*` → refetch struktury.
3. `UserWorldMapWidget` → `profiles` INSERT/UPDATE/DELETE → refetch mapy.
4. `useOrganizationTree` → `profiles` → refetch drzewa.
5. `TrainingManagement` → `training_progress` + `training_assignments` → refetch (koreluje z pkt D4).
Wspólny wzorzec: brak filtra po stronie serwera + callback robiący pełny SELECT. Kierunek naprawy: filtry `filter:` na kanale, wykluczenie kolumny `last_seen` z wyzwalania refetchu, debounce.

## G. Auth — do zmierzenia po przywróceniu loginu
HAR z login → dashboard: liczba requestów, podział na token / profiles / user_roles / MFA / notifications / pozostałe globalne. AuthContext nie będzie dzielony bez tego pomiaru.

## H. Metryki BEFORE/AFTER (obowiązkowy szablon dla każdej zmiany)
| metryka | BEFORE | AFTER |
|---|---|---|
| requesty / 10 min | | |
| DB writes / 10 min | | |
| DB reads / 10 min | | |
| CPU % | | |
| Disk IO % | | |
| p50 / p95 czas odpowiedzi REST | | |
| funkcjonalność (checklista) | | |

Pomiar: 10-minutowe okno przy zalogowanej sesji, ta sama pora dnia, ten sam scenariusz (dashboard 5 min widoczny + 5 min hidden), źródła: HAR + `pg_stat_statements` reset/delta + panel Infrastructure.

## I. Priorytety i kolejność wdrożenia

**P0 (odciąża bazę natychmiast):**
1. TTL pg_net 1 h + `VACUUM (ANALYZE) net._http_response`.
2. Indeks + batch cleanup + retencja 14 dni dla `cron.job_run_details` + `VACUUM (ANALYZE)`.
3. Autovacuum tuning obu tabel rozszerzeń.

**P1 (duży wpływ / małe ryzyko):**
4. Advisory lock w sześciu funkcjach cron.
5. Rozsunięcie offsetów startów jobów.
6. #17 `*/2` → `*/10` (dowód: 0 wierszy źródłowych).
7. Filtry i debounce na realtime `profiles` (4 miejsca) — po pomiarze.
8. Stabilna nazwa kanału w `useNotifications` (usunięcie `Date.now()`).

**P2:** `limit` w `send-meeting-reminders`, audyt `limit 5000` w #16, lazy mount paneli admina.
**P3:** czyszczenie `select('*')` tam, gdzie transfer jest realnie duży. Bez zmian w `useNotifications` polling.

### TOP 10 działań — spodziewane odciążenie i ryzyko
| # | Działanie | Spodziewane odciążenie | Ryzyko | Rollback |
|---|---|---|---|---|
| 1 | TTL pg_net + VACUUM | eliminacja 95 677 s CPU cleanupu | niskie | reset TTL |
| 2 | cleanup `job_run_details` + indeks | 161 MB → <10 MB, koniec seq scanów | niskie | brak |
| 3 | autovacuum tuning | zapobiega nawrotowi | b. niskie | RESET |
| 4 | advisory locki | brak nakładania jobów | niskie | usunięcie locka |
| 5 | offsety jobów | brak szczytów co 30 min | b. niskie | przywrócenie schedule |
| 6 | #17 `*/10` | 720 → 144 wywołań/dobę | niskie | powrót `*/2` |
| 7 | realtime `profiles` filtry | redukcja `list_changes` | **średnie** (dane w UI) | rewert kodu |
| 8 | kanał `useNotifications` | brak duplikatów subskrypcji | niskie | rewert |
| 9 | `limit` w reminderach | ograniczenie dużych SELECT | niskie | rewert |
| 10 | lazy mount paneli admina | mniej zapytań na wejściu | niskie | rewert |

Kolejność: 1 → 2 → 3 (pomiar) → 4 → 5 → 6 (pomiar) → 8 → 9 → 7 (pomiar) → 10.

Czekam na Twoją zgodę. Bez niej nie uruchamiam żadnej z powyższych operacji.
