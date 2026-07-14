
## Problem

Obecna edge function `send-webinar-confirmation` ma już blok „immediate reminder" dla rejestracji <60 min przed startem, ale:

1. Używa tego samego szablonu `reminder_15min` niezależnie od tego, czy zostało 45 min czy 3 min — brakuje pilnej wersji „pokój już otwarty, dołącz natychmiast".
2. Czyta `events.start_time` i `events.zoom_link` — dla eventów cyklicznych (multi-occurrence) bierze pierwszą okazję i pomija per-occurrence zoom link, przez co przy rejestracji tuż przed konkretnym terminem gość dostaje link do złej daty albo brak linku.
3. Gdy linku brakuje albo wysyłka padnie, admin dostaje tylko in-app notification — nie ma maila, więc łatwo to przegapić.
4. Nie ma zbiorczego dziennego alertu „X gości nie dostało linku, wejdź w CMS i wyślij ręcznie".

Cel: każdy kto zarejestruje się <15 min przed startem dostaje dwa maile — potwierdzenie rejestracji (bez zmian) + natychmiastowy „dołącz do spotkania" z aktualnym linkiem i komunikatem „pokój już otwarty". Każda porażka wysyłki linku ma trafiać emailem do wszystkich adminów z linkiem do panelu, żeby ręcznie ponowili.

## Zakres zmian

### 1. Nowy szablon email `webinar_join_now`

Dodać do `email_templates` (przez migrację/seed) nowy szablon:
- `internal_name: 'webinar_join_now'`
- Temat: „🔴 Pokój już otwarty — dołącz teraz do {{event_title}}"
- Treść: krótka, urgent — „Zarejestrowałeś się tuż przed startem. Pokój webinaru jest już otwarty, kliknij poniżej żeby dołączyć natychmiast" + duży CTA z `{{zoom_link}}` + info o godzinie startu.

Jeśli tabela `email_templates` nie ma tego wpisu, funkcja użyje wbudowanego fallback HTML (jak inne szablony w `send-webinar-email`).

### 2. `send-webinar-confirmation/index.ts` — poprawiona logika immediate reminder

Refaktor bloku z linii ~732–842:

1. **Właściwy start i link dla wybranej okazji.** Zamiast `events.start_time`/`events.zoom_link`:
   - Preferować `eventDate` przekazane z klienta (już zawiera konkretną okazję).
   - Dla eventów z `occurrences: jsonb[]` znaleźć wpis pasujący datą/godziną i użyć jego `zoom_link` (fallback: `events.zoom_link` → `events.location`).
2. **Dwa progi zamiast jednego:**
   - `minutesUntilStart <= 15` (włącznie z ujemnym do -30 min, bo „pokój otwarty") → wywołać `send-webinar-email` z nowym `type: 'join_now'` (szablon `webinar_join_now`).
   - `15 < minutesUntilStart <= 60` → dotychczasowy `type: 'reminder_15min'`.
3. **Nie blokować głównego confirmation emaila.** Confirmation leci pierwszy (jak dziś), a `join_now`/`reminder_15min` idzie zaraz po nim jako drugi email.
4. **Flagi dedupe.** Ustawiać `reminder_15min_sent=true` w `guest_event_registrations` / `event_registrations` żeby CRON `send-bulk-webinar-reminders` nie wysłał trzeciego maila. Dla wielo-okazji zapisać też wpis w `occurrence_reminders_sent` (event_id + occurrence_datetime + `reminder_type='15min'` + email).
5. **Bramka: brak linku.** Jeśli po fallbackach `zoom_link` jest pusty:
   - Zalogować to jako failure w `email_logs` z `metadata.type='join_now_missing_link'`.
   - Wywołać nową helper-funkcję `notifyAdminsMissingLink(email, eventId, eventTitle, occurrenceDatetime, reason)` (patrz pkt 3).
6. **Bramka: SMTP fail.** Try/catch wokół `send-webinar-email` invoke — jeśli rzuci błąd, wywołać tę samą helper-funkcję z `reason='send_failed'`.

### 3. `send-webinar-email/index.ts` — obsługa `type='join_now'`

Dodać gałąź `join_now` obok istniejących `reminder_2h/1h/15min`:
- Ładuje szablon `webinar_join_now` z `email_templates`, fallback do wbudowanego HTML (temat + CTA + zoom_link).
- Loguje do `email_logs` z `metadata.type='join_now'`.
- Rzuca błąd (nie łyka po cichu) — żeby caller z pkt 2.6 mógł wykryć fail i zaalarmować admina.

### 4. Alerty do adminów mailem (pojedynczy + digest)

**4a. Natychmiastowy alert per gość** — nowa edge function `notify-admins-missing-join-link`:
- Input: `{ email, first_name, event_id, event_title, occurrence_datetime?, reason: 'no_link'|'send_failed' }`.
- Pobiera adresy wszystkich adminów z `user_roles` + `profiles.email`.
- Wysyła jeden email do adminów (BCC lub pętla) z tematem „⚠️ Gość nie dostał linku do webinaru — akcja wymagana" i CTA linkującym do `/admin/events` (zakładka Rejestracje → Goście → nowy przycisk „Ponów przypomnienie" per gość, już istnieje z poprzedniej iteracji).
- Zapisuje wpis w nowej tabeli `missing_join_link_alerts` (patrz pkt 5) żeby uniknąć duplikatów i zasilić digest.
- Wywołuje też in-app `user_notifications` (jak dziś).

**4b. Nic dodatkowo dziennie** — na razie tylko natychmiastowy alert per zdarzenie; jeśli okaże się za dużo szumu, dodamy debounce (max 1 alert/gość/event) po stronie tabeli z pkt 5.

### 5. Tabela `missing_join_link_alerts` (migracja)

```
id uuid pk
event_id uuid not null references events(id) on delete cascade
occurrence_datetime timestamptz null
recipient_email text not null
reason text not null      -- 'no_link' | 'send_failed'
resolved_at timestamptz null   -- ustawiane gdy admin ręcznie ponowi
resolved_by uuid null
created_at timestamptz default now()
unique (event_id, occurrence_datetime, recipient_email, reason)
```

GRANT tylko dla `authenticated` (SELECT dla adminów przez RLS `has_role(auth.uid(),'admin')`) i `service_role` (ALL). RLS: admin SELECT/UPDATE, service_role ALL. Insert wyłącznie z edge function (service_role).

Po ręcznej wysyłce w panelu (istniejący dropdown „Ponów przypomnienie 15min") frontend robi update `resolved_at=now(), resolved_by=auth.uid()` dla pasującego wpisu.

### 6. UI — `EventRegistrationsManagement.tsx`

Drobne uzupełnienie istniejącej kolumny „Powiadomienia":
- Dodać czerwony badge „⚠ brak linku" gdy istnieje niezresetowany wpis w `missing_join_link_alerts` dla `email+event+occurrence`.
- Po sukcesie akcji „Ponów 15min" wołać `resolve_missing_join_link_alert(alert_id)` (nowa security-definer funkcja) lub prostym `.update()`.

Bez nowego layoutu — reużywamy istniejący dropdown ponawiania z poprzedniej iteracji.

### 7. Weryfikacja

- Testowy webinar 10 min w przyszłości, rejestracja gościa → dostaje 2 maile (potwierdzenie + „Pokój już otwarty").
- Ten sam webinar bez `zoom_link` na okazji ani na evencie → gość dostaje tylko potwierdzenie, admini dostają mail „gość X nie dostał linku, wejdź do panelu i wyślij ręcznie", w UI pojawia się czerwony badge.
- Klik „Ponów 15min" w panelu → wysyła join_now, badge znika.
- Rejestracja 40 min przed startem → stary flow reminder_15min (bez join_now).
- CRON `send-bulk-webinar-reminders` na tym samym gościu → dedupe, nie wysyła drugi raz.

## Sekcja techniczna

Pliki:
- `supabase/functions/send-webinar-confirmation/index.ts` — refaktor bloku immediate reminder (multi-occurrence + próg 15 min + alert).
- `supabase/functions/send-webinar-email/index.ts` — nowy `type: 'join_now'` + throw on fail.
- `supabase/functions/notify-admins-missing-join-link/index.ts` — nowa funkcja.
- `supabase/functions/_shared/…` — helper `resolveOccurrenceLink(event, eventDate)` reużywalny.
- Migracja SQL — tabela `missing_join_link_alerts` + GRANT + RLS + opcjonalna funkcja `resolve_missing_join_link_alert`.
- Seed/migracja `email_templates` — wpis `webinar_join_now` (temat + HTML z `{{zoom_link}}`, `{{event_title}}`, `{{first_name}}`, `{{event_time}}`).
- `src/components/admin/EventRegistrationsManagement.tsx` — badge „brak linku" + resolve po ponownej wysyłce.

Bez zmian w kliencie `EventGuestRegistration.tsx` — payload dla `send-webinar-confirmation` już zawiera potrzebne `eventDate`.
