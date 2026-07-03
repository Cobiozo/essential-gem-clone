# Powiadomienia e-mail o wydarzeniach (kampanie zapisu)

Dodajemy adminowi możliwość, w trakcie tworzenia/edycji wydarzenia (Zdarzenia → wszystkie typy, w tym `team_training`), zaplanowania jednego lub wielu wysyłek e-mail z zaproszeniem „Zapisz się" do **wszystkich aktywnych, niezablokowanych** użytkowników. CRON co 5 minut nadzoruje wysyłkę; każda kolejna tura pomija osoby, które już otrzymały mail lub już się zapisały.

## Zakres

- Dotyczy wydarzeń zarządzanych w `EventsManagement` (tabela `events`), w tym `team_training`, webinarów itd. — pole „Kampania powiadomień e-mail" w sekcji Powiadomienia formularza wydarzenia.
- Nie dotyczy: płatnych `paid_events`, auto-webinarów, spotkań indywidualnych.

## UI administratora (EventsManagement → formularz wydarzenia)

Nowa sekcja **„Kampania e-mail: zaproszenie do zapisu"**:

1. Toggle „Wyślij zaproszenie e-mail do wszystkich aktywnych użytkowników".
2. Lista terminów wysyłek (min. 1, max. 5): każdy termin ma
   - Tryb: „Natychmiast po utworzeniu" LUB „Data i godzina" (datetime-local w strefie Warsaw, konwersja `warsawLocalToUtc`).
   - Etykieta pomocnicza (np. „Pierwsze zaproszenie", „Przypomnienie 24h").
   - Status tylko-do-odczytu po wysyłce: pending / sent (`sent_at`, licznik odbiorców).
3. Podgląd treści maila (readonly) z placeholderami: tytuł, opis, data/godzina wydarzenia, prowadzący, CTA **„Zapisz się"**.
4. Przy zapisie formularza upsert wierszy w `event_email_campaigns` powiązanych z `event_id`.

## Treść e-mail

Nowy szablon React Email `event-invitation.tsx` w `supabase/functions/_shared/transactional-email-templates/`:
- Tytuł, opis (pierwsze ~500 znaków), data/godzina w strefie warszawskiej, prowadzący, miejsce (link/adres).
- Duży przycisk CTA **„Zapisz się"** → `https://<app>/events/team-meetings?event=<eventId>&utm=email_invite` (dla `team_training`; dla innych typów odpowiednia trasa listy wydarzeń, np. `/events/webinars?event=…`).
- Trasy są chronione — niezalogowany trafi na `/auth` (istniejący `PrivateRoute`), a po zalogowaniu wróci na docelową trasę z parametrem `?event=` — `TeamMeetingsPage` już otwiera `EventCardCompact` z `defaultOpen`, więc karta rozwinie się z widocznym przyciskiem „Zapisz się".
- Podświetlenie karty: dodać w `EventCardCompact` klasę akcentu (ring + delikatna animacja) gdy `defaultOpen` z parametru URL `event`.

## Deep link i UX zapisu

- `TeamMeetingsPage` już czyta `?event=` i otwiera kartę — dodać scroll `element.scrollIntoView` oraz pulsujący `ring-2 ring-primary` na 3 sekundy dla podświetlonej karty.
- Dla innych typów wydarzeń (webinar itd.) analogicznie na ich stronach listy (poza zakresem, jeśli admin włączy kampanię tylko dla `team_training` — na start ograniczamy do `team_training`, resztę można włączyć później flagą typu wydarzenia).
- Logowanie i redirect: `AuthPage` już wspiera `?redirect=` — CTA generujemy z `redirect` na trasę docelową z `event` query, żeby po zalogowaniu użytkownik trafił bezpośrednio na wydarzenie.

## Baza danych (migracja)

Tabela `event_email_campaigns`:
- `event_id uuid → events(id) on delete cascade`
- `scheduled_at timestamptz` (nullable dla trybu „natychmiast" — wtedy = `created_at`)
- `mode text check in ('immediate','scheduled')`
- `label text`
- `status text check in ('pending','processing','sent','failed')` default `pending`
- `sent_at timestamptz`, `recipients_count int`, `error text`
- audyt: `created_by uuid`, `created_at`, `updated_at`

Tabela `event_email_recipients` (dedup per user per event, nie per campaign):
- `event_id uuid`, `user_id uuid`, `email text`, `campaign_id uuid`, `sent_at timestamptz`
- UNIQUE (`event_id`, `user_id`) — gwarantuje, że każdy użytkownik dostanie mail o danym wydarzeniu tylko raz, niezależnie od liczby zaplanowanych tur.

GRANTs + RLS: admin/moderator z uprawnieniem `events` — pełny dostęp; pozostali brak dostępu (dane administracyjne).

## Kryteria odbiorców

Dla każdej tury wysyłki:
```
SELECT p.user_id, u.email
FROM profiles p JOIN auth.users u ON u.id = p.user_id
WHERE p.is_active = true
  AND p.is_blocked IS NOT TRUE
  AND u.email IS NOT NULL
  AND u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM event_email_recipients r
                   WHERE r.event_id = :event_id AND r.user_id = p.user_id)
  AND NOT EXISTS (SELECT 1 FROM event_registrations er
                   WHERE er.event_id = :event_id AND er.user_id = p.user_id)
```
(Dokładne nazwy kolumn `is_active`/`is_blocked` zweryfikuję przy migracji na podstawie realnego schematu `profiles`.)

## Nadzór / CRON

Edge Function **`process-event-email-campaigns`** wołana co 5 min przez `pg_cron` (`supabase--insert`, klucz anon):
1. Wybiera `event_email_campaigns` w statusie `pending` gdzie `scheduled_at <= now()` (dla `immediate` scheduler ustawia `scheduled_at = now()` przy zapisie formularza).
2. Ustawia status `processing`, ładuje kandydatów, wywołuje `send-transactional-email` per odbiorca (`templateName: event-invitation`, `idempotencyKey: campaign:<id>:user:<uid>`), po sukcesie wstawia wiersz do `event_email_recipients`.
3. Batch max 200/odbiorców/uruchomienie (kolejka pgmq już rate-limituje), reszta w kolejnej iteracji.
4. Finalizuje status `sent` + licznik.

## Poza zakresem
- SMS-y (mamy tylko email w tym zleceniu).
- Kampanie dla `paid_events` i auto-webinarów.
- Segmentacja odbiorców po roli/zespole (na razie: wszyscy aktywni, niezablokowani).
- Retroaktywne wysyłki do historycznych wydarzeń.

## Pliki do utworzenia/edycji
- Migracja SQL: nowe tabele + RLS + GRANT.
- `supabase/functions/process-event-email-campaigns/index.ts` (nowa) + wpis w `supabase/config.toml`.
- `supabase/functions/_shared/transactional-email-templates/event-invitation.tsx` + rejestracja w `registry.ts`.
- `supabase--insert` CRON co 5 min.
- `src/components/admin/EventsManagement.tsx` — nowa sekcja formularza + zapis kampanii.
- `src/components/events/EventCardCompact.tsx` — podświetlenie/scroll dla `defaultOpen` z URL.
- Trasy: `AuthPage` — obsługa `?redirect=` już jest, weryfikacja tylko.

## Odpowiedzi dla użytkownika
- Historyczne kampanie: brak — funkcja działa od wdrożenia. Jeśli chcesz, mogę dorzucić przycisk „Wyślij teraz do jeszcze niepowiadomionych" dla istniejących nadchodzących wydarzeń — potwierdź.
