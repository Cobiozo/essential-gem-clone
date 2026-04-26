## Cel

Każda rejestracja przez darmowy formularz wydarzenia (z linkiem partnerskim) ma trafiać do CRM partnera jako **osobny wpis w zakładce „Z zaproszeń na eventy"** — niezależnie od tego, czy ten sam e-mail istnieje już w innym miejscu (Strona partnerska, Auto-webinar, Moja lista kontaktów). Dopiero gdy partner sam zechce przenieść taki kontakt do **„Mojej listy kontaktów"**, ma się pojawić istniejące już okno „Wykryto duplikat" z możliwością scalenia / dopisania danych.

## Co działa, co nie działa

- **Działa już dziś (auto-webinary, strony partnerskie):** każda rejestracja tworzy osobny rekord w `team_contacts` z unikalnym `contact_source` (np. „Auto-webinar z dnia 27.03.2026, godz. 11:30") — ten sam e-mail może mieć wiele wpisów, każdy w swojej zakładce.
- **Działa już dziś (przenoszenie do Mojej listy):** funkcja `moveToOwnList` w `useTeamContacts.ts` uruchamia `checkDuplicateBeforeMove` — porównuje e-mail+telefon z listą „Moja lista kontaktów" i pokazuje dialog duplikatu. To zostaje bez zmian.
- **Nie działa (formularze eventów):** RPC `submit_event_form` po ostatniej naprawie wciąż łapie `unique_violation` w bloku `EXCEPTION` — w bazie nie ma żadnego unique constraintu na `(user_id, email)`, więc nominalnie INSERT przejdzie, ale przy każdej rejestracji w zakładce „Z zaproszeń na eventy" pojawia się tylko jeden zbiorczy wpis z napisem „Zapisany przez Twój link na: <tytuł>" — kolejne rejestracje tej samej osoby na to samo wydarzenie nadpisują ten sam wiersz wizualnie (ten sam `contact_source = 'event_invite'` + ten sam `contact_reason`), a tym bardziej rejestracje na **różne** wydarzenia nie tworzą rozróżnialnych wpisów.

## Rozwiązanie

### 1. Migracja SQL — `submit_event_form`

Zmiana strategii: **bez deduplikacji**, każda rejestracja → nowy wiersz w `team_contacts`, w identycznym wzorcu jak auto-webinary.

- `contact_source` = `'event_invite: <tytuł wydarzenia> (<data>)'` — np. `event_invite: BOM Kraków (12.05.2026)`. Prefiks `event_invite:` zostaje, żeby front mógł go rozpoznać i pokazywać w zakładce „Z zaproszeń na eventy" (filtr używa `startsWith('event_invite')` zamiast obecnego `=== 'event_invite'`).
- `contact_reason` = `'Zapisany przez Twój link na: <tytuł> (<data>)'`.
- Usunięcie bloku `EXCEPTION WHEN unique_violation` (i tak nie ma na czym zadziałać). Zostawiamy tylko `WHEN OTHERS THEN RAISE LOG …` jako bezpiecznik, by problem CRM nigdy nie zablokował samej rejestracji.
- Reszta logiki RPC (resolve `ref_code`, `submission_count++`, zwracany `confirmation_token`) — bez zmian.

### 2. Frontend — zakładka „Z zaproszeń na eventy"

Plik: `src/components/team-contacts/TeamContactsTab.tsx`

- Linia 291: zmiana filtra
  ```ts
  const paidEventInviteContacts = privateContacts.filter(
    c => (c.contact_source === 'event_invite' || c.contact_source?.startsWith('event_invite'))
         && !(c as any).moved_to_own_list
  );
  ```
- Linia 297 (warunek `isPaidEventInvite` w „Mojej liście") — analogicznie `startsWith('event_invite')`, żeby stare jednowyrazowe wartości też były wykluczane z Mojej listy aż do momentu jawnego przeniesienia.
- W pozostałych miejscach (`partnerPageContacts`, eventy BO/HC/General) — bez zmian.

### 3. Mechanizm przenoszenia do „Mojej listy kontaktów" — bez zmian

`moveToOwnList(id)` → `checkDuplicateBeforeMove(id)` już dziś:
- znajduje istniejące kontakty w „Mojej liście" (z `moved_to_own_list = true` lub spoza zakładek eventowych) o tym samym e-mailu + telefonie,
- jeśli znajdzie → zwraca `'duplicate'`, UI pokazuje dialog „Taki kontakt już istnieje. Czy dopisać dane?" (komponent `DuplicateContactDialog` używany w `EventGroupedContacts.tsx` i `TeamContactsTab.tsx`),
- partner może wybrać: scal (uzupełnij brakujące pola np. wydarzenie/notatka) lub utwórz osobny.

Ten przepływ pokrywa się z opisem z wiadomości — niczego tu nie zmieniamy. Upewnimy się tylko, że dialog scalania faktycznie pozwala dopisać `contact_reason` / notatkę o wydarzeniu z przenoszonego rekordu (sprawdzimy `DuplicateContactDialog` i jeśli trzeba, dopiszemy automatyczne dopisanie linijki „Brał udział w: <tytuł> (<data>)" do `notes` istniejącego kontaktu — bez nadpisywania).

### 4. Backfill historyczny

Jednorazowy SQL: dla każdej `event_form_submission` z ostatnich 60 dni z `partner_user_id IS NOT NULL`, wstaw nowy wiersz w `team_contacts` z nowym wzorcem `contact_source` (`event_invite: <tytuł> (<data>)`) — tylko jeśli **nie istnieje już rekord o dokładnie takim samym `(user_id, email, contact_source)`** (idempotencja po samym backfillu, nie po e-mailu globalnie). Dzięki temu Janeusz pojawi się jako osobny wpis w zakładce Sebastiana „Z zaproszeń na eventy", obok istniejących wpisów z auto-webinarów.

## Pliki do zmiany

- nowa migracja SQL: redefinicja `public.submit_event_form` + jednorazowy backfill
- `src/components/team-contacts/TeamContactsTab.tsx` — filtry `paidEventInviteContacts` i `isPaidEventInvite` na `startsWith('event_invite')`
- `src/components/team-contacts/EventGroupedContacts.tsx` / `TeamContactAccordion.tsx` — sprawdzenie i (jeśli trzeba) drobne dopasowanie warunków używających `'event_invite'` jako dokładnej wartości
- ewentualnie `src/components/team-contacts/DuplicateContactDialog.tsx` — dopisanie opcji „Dopisz informację o wydarzeniu do notatek"

## Efekt

- Każda rejestracja Janeusza (i każdego innego gościa) z linkiem partnera ląduje w zakładce **„Z zaproszeń na eventy"** jako osobny wiersz z czytelnym `contact_source` zawierającym tytuł i datę wydarzenia — analogicznie do auto-webinarów.
- „Moja lista kontaktów" pozostaje w gestii partnera: pokazuje tylko to, co partner świadomie tam przeniósł.
- Przy próbie przeniesienia duplikatu — istniejący dialog informuje o duplikacie i pozwala dopisać brakujące dane (np. udział w wydarzeniu) do istniejącego kontaktu.
- Submission rejestracyjne nigdy nie jest blokowane przez problem z CRM (zachowany guard + logowanie do `postgres_logs`).
