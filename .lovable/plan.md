## Zakres

Trzy niezależne usprawnienia wokół systemu „brak linku do webinaru":

1. **Automatyczne retry wysyłki join-link email** przy błędzie SMTP + logowanie przyczyny i liczby prób.
2. **Modal szczegółów alertu „brak linku"** z pełną diagnostyką i historią rezolucji/ponownych wysyłek.
3. **Naprawa obcinania tabeli rejestracji** na screenie (kolumna „Akcje" ucina się po prawej) — poprawa responsywności listy gości.

---

### 1. Automatyczne retry wysyłki join-link (SMTP fail)

**Nowe pola w `missing_join_link_alerts`** (migracja):
- `attempt_count int not null default 1`
- `last_attempt_at timestamptz`
- `last_error text` — treść błędu SMTP / bramki
- `next_retry_at timestamptz` — kiedy CRON ma spróbować ponownie
- `max_attempts int not null default 5`

**Nowa edge function `retry-missing-join-links`** (CRON co 2 min):
- Wybiera rekordy z `resolved_at IS NULL AND attempt_count < max_attempts AND next_retry_at <= now()`.
- Ponownie liczy `zoom_link` (per okazja z `resolveOccurrenceLink` jak w confirmation).
- Wywołuje `send-webinar-email` z `type: 'join_now'`.
- Sukces → `resolved_at=now(), resolved_by=null` (auto-resolve) + wpis w nowej tabeli `join_link_retry_log`.
- Fail → `attempt_count++`, `last_error=<msg>`, `next_retry_at = now() + exp_backoff(2^attempt min, cap 30 min)`.
- Po wyczerpaniu prób (attempt = max) → jeden zbiorczy email do adminów „gość X, N prób, wszystkie padły".

**Nowa tabela `join_link_retry_log`** (audit):
```
id uuid pk
alert_id uuid fk missing_join_link_alerts on delete cascade
attempt_no int
attempted_at timestamptz default now()
outcome text  -- 'sent' | 'smtp_error' | 'no_link' | 'manual_resend'
error_message text
triggered_by text  -- 'cron' | 'admin:<uuid>'
zoom_link_used text
```
GRANT: `authenticated` SELECT (przez RLS admin), `service_role` ALL.

**Modyfikacja `send-webinar-confirmation`**: przy pierwszym błędzie tworzy alert z `attempt_count=1`, `next_retry_at=now()+2min` — dalej CRON.

**Modyfikacja `EventRegistrationsManagement.tsx`**: badge „⚠ brak linku" pokazuje też licznik „(3/5)" i tooltip z `last_error`.

---

### 2. Modal szczegółów alertu „brak linku"

**Nowy komponent `MissingJoinLinkDetailsDialog.tsx`** otwierany klikiem w badge „⚠ brak linku":

Sekcje:
- **Nagłówek**: gość (imię, email), event (tytuł, data okazji), status alertu (`open` / `resolved`).
- **Diagnostyka**:
  - `reason` (`no_link` / `send_failed`) — czytelny opis PL.
  - Aktualny `zoom_link` z okazji (pusty / obecny + preview URL).
  - `resolveOccurrenceLink` output — pokazuje po którym fallbacku poszło (`occurrences[i].zoom_link` → `events.zoom_link` → `events.location` → brak).
  - Ostatni błąd SMTP (`last_error`).
- **Historia prób** (`join_link_retry_log` join po `alert_id`):
  - Tabelka: `#`, data, źródło (CRON/Admin), wynik, użyty link, błąd.
- **Akcje**:
  - „Wyślij teraz ręcznie" — wywołuje istniejący flow ponawiania 15min, dopisuje log z `triggered_by='admin:<uid>'`.
  - „Oznacz jako rozwiązane" — ustawia `resolved_at`, `resolved_by=auth.uid()`.
  - „Reset licznika prób" — zeruje `attempt_count`, `next_retry_at=now()`.

Query przez `useQuery` z realtime subscription na `missing_join_link_alerts` + `join_link_retry_log`.

---

### 3. Naprawa obcinania tabeli rejestracji

Na screenie kolumna „Akcje" wychodzi poza kontener (widać obcięty ikonę koperty). Przyczyna: tabela ma stałą liczbę kolumn i brak wrappera z overflow / sticky ostatniej kolumny.

Zmiany w `EventRegistrationsManagement.tsx`:
- Wrap `<table>` w `<div className="w-full overflow-x-auto">` (już częściowo jest w innych komponentach, brakuje tu).
- Kolumna „Akcje": `sticky right-0 bg-background z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)]` — zawsze widoczna.
- Kolumna „Powiadomienia" (badge grid): `min-w-[180px] max-w-[220px]` + `flex-wrap` w środku.
- Kolumna „Imię/nazwisko": `min-w-[160px]`, `Email`: `min-w-[220px] truncate`, `Telefon`: `min-w-[140px] whitespace-nowrap`.
- Dodać `whitespace-nowrap` na komórkach dat/statusów żeby nie łamały układu.
- Na mobile (`md:hidden`) alternatywna karta na gościa (jedna karta = jeden wiersz w gridzie), zamiast horizontal scroll — reużyć wzorzec z `LeaderEventRegistrationsView`.

Bez zmian w logice biznesowej listy.

---

## Weryfikacja

1. Sztuczny błąd SMTP (nieprawidłowy `zoom_link`) → alert pojawia się z `attempt_count=1`, CRON po 2 min ponawia, po 5 próbach mail zbiorczy.
2. Klik badge „⚠ brak linku" → modal z historią 5 prób, każdy z timestampem, źródłem, użytym linkiem.
3. „Wyślij ręcznie" z modala → nowy wpis w logu `triggered_by='admin:<uid>'`, badge znika po sukcesie.
4. Screen na 1280×800 i 1920×1080 → kolumna „Akcje" widoczna zawsze, brak poziomego obcięcia; na 375px karty zamiast tabeli.

## Sekcja techniczna

**Pliki:**
- Migracja SQL — pola w `missing_join_link_alerts` + nowa tabela `join_link_retry_log` (GRANT + RLS admin SELECT, service_role ALL).
- `supabase/functions/retry-missing-join-links/index.ts` — nowa funkcja + wpis w `supabase/config.toml` (`schedule = "*/2 * * * *"`, `verify_jwt=false`).
- `supabase/functions/send-webinar-confirmation/index.ts` — inicjalizacja `attempt_count`, `next_retry_at` przy pierwszym fail.
- `supabase/functions/notify-admins-missing-join-link/index.ts` — dodać tryb „max_attempts_exhausted" (inny temat maila).
- `src/components/admin/MissingJoinLinkDetailsDialog.tsx` — nowy modal.
- `src/components/admin/EventRegistrationsManagement.tsx` — badge z licznikiem + otwieranie modala + refaktor layoutu tabeli (sticky, min-width, mobile cards).

Bez zmian w `send-webinar-email` (już rzuca błąd na fail — retry loop tego używa).
