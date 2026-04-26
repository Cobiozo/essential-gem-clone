## Problem

Janeusz Janeuszowski zapisał się przez darmowy formularz wydarzenia (BOM Kraków, slug `bom-krakow`) z linkiem polecającym sebastiansnopek.eqology. Submission jest poprawnie utworzona w `event_form_submissions` z `partner_user_id = 60645dff-…` (Sebastian), ale w jego CRM (`team_contacts`) kontakt nie istnieje.

## Przyczyna

Funkcja RPC `submit_event_form` (PL/pgSQL, SECURITY DEFINER) próbuje dodać gościa do CRM-u partnera takim insertem:

```sql
INSERT INTO public.team_contacts (..., role, contact_type, contact_source, ...)
VALUES (..., 'guest', 'guest', 'event_invite', ...);
```

Tabela `team_contacts` ma jednak ograniczenie:

```
team_contacts_role_check: role = ANY (ARRAY['client','partner','specjalista'])
```

Wartość `'guest'` jest niedozwolona, więc INSERT podnosi `check_violation`. Funkcja łapie ten wyjątek klauzulą `WHEN OTHERS THEN NULL`, więc submission kończy się sukcesem, a kontakt po cichu **nie jest dodawany**. Sebastian nie zobaczy nikogo, kto zapisał się przez jego link rejestracyjny.

Potwierdzenie w bazie: `SELECT DISTINCT contact_type, role FROM team_contacts` — żadnego rekordu z `'guest'`. Pozostałe ścieżki (auto-webinary, save-partner-lead, register-event-transfer-order) konsekwentnie zapisują `role='client'`, `contact_type='private'`.

## Rozwiązanie

Migracja SQL aktualizująca funkcję `submit_event_form` tak, by używała wartości zgodnych z resztą systemu i z constraintami tabeli:

- `role = 'client'`
- `contact_type = 'private'`
- `contact_source = 'event_invite'` (bez zmian — pole `text`, używane do filtrów)
- `contact_reason = 'Zapisany przez Twój link na: <tytuł wydarzenia/formularza>'` (bez zmian)
- pozostała logika (resolve partnera po `ref_code`, zliczanie submission_count, idempotencja po unique `(user_id, email)`) — bez zmian

Dodatkowo: zostawić `EXCEPTION WHEN OTHERS THEN NULL`, żeby drobne problemy z CRM nigdy nie blokowały zapisu rejestracji, ale dopisać `RAISE LOG`, aby przyszłe ciche błędy były widoczne w `postgres_logs`.

## Backfill

Po wdrożeniu migracji: jednorazowy backfill brakujących kontaktów z `event_form_submissions` z ostatnich 60 dni (gdzie `partner_user_id IS NOT NULL` i nie ma jeszcze odpowiadającego rekordu w `team_contacts (user_id, email)`). Wstawiamy z tym samym mappingiem (`role='client'`, `contact_type='private'`, `contact_source='event_invite'`). Janeusz pojawi się w CRM Sebastiana.

## Pliki

- nowa migracja SQL — aktualizacja `public.submit_event_form` + jednorazowy `INSERT … SELECT … ON CONFLICT DO NOTHING` dla backfillu

## Efekt

- Każde nowe zgłoszenie przez darmowy formularz wydarzenia z linkiem partnera trafia do CRM tego partnera jako kontakt typu „Klient” (private), źródło `event_invite`, z notatką wskazującą, na które wydarzenie się zapisał.
- Historyczne zgłoszenia (w tym Janeusz) zostają jednorazowo dosypane do CRM-ów odpowiednich partnerów.
- Submission nigdy nie jest blokowana przez problem z CRM (zachowany guard), ale wszelkie cichoodrzucone insercje będą logowane w `postgres_logs`.