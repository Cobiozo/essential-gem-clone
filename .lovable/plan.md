## Problem

Gość PLC ma już 3 aktywne rezerwacje na to samo wydarzenie. Blokada frontendowa działa za późno albo nie wykrywa rezerwacji w tej ścieżce, a backend przelewu nadal pozwala utworzyć kolejne zamówienie, zamiast zwrócić informację „masz już rezerwację”.

## Plan naprawy

1. **Ujednolicić wykrywanie istniejącego biletu**
   - `PurchaseDrawer` przestanie używać własnej, starej kopii zapytania i użyje `useHasOwnEventTicket` jako jednego źródła prawdy.
   - Hook będzie zwracał stan „gotowe/ładowanie”, żeby nie otwierać formularza zanim sprawdzenie rezerwacji się zakończy.

2. **Zablokować przycisk „Zapisz się” na stronie wydarzenia**
   - W `PaidEventPage` przy kliknięciu CTA:
     - jeśli sprawdzanie jeszcze trwa → nie otwieramy formularza,
     - jeśli użytkownik ma aktywną rezerwację → pokazujemy komunikat „Masz już rezerwację na to wydarzenie” i przewijamy do sekcji „Twoje bilety”.
   - Do `PaidEventSidebar` dodam stan blokady CTA: przy istniejącej rezerwacji przycisk pokaże „Masz już rezerwację” zamiast nadal wyglądać jak aktywna rejestracja.

3. **Usunąć tryb „kupuję kolejny bilet dla gości” dla zalogowanego użytkownika z własną rezerwacją**
   - W `PurchaseDrawer` każdy zalogowany użytkownik z istniejącą rezerwacją zobaczy wyłącznie komunikat o posiadanej rezerwacji + przycisk „Zamknij”.
   - Nie będzie już możliwości zwiększenia liczby biletów i dopisania siebie lub kolejnej osoby w tym samym flow.

4. **Dodać twardą blokadę backendową dla przelewu**
   - W `supabase/functions/register-event-transfer-order/index.ts` przed utworzeniem zamówienia dodam sprawdzenie:
     - aktywne `paid_event_orders` po `user_id`,
     - aktywne `paid_event_orders` po e-mailu,
     - aktywne `paid_event_order_attendees` po e-mailu,
     - aktywne `event_form_submissions` po e-mailu,
     - z wykluczeniem kont usuniętych przez `account_deleted_at IS NULL`.
   - Jeśli istnieje rezerwacja, funkcja zwróci `already_registered` z tekstem „Masz już rezerwację na to wydarzenie”.

5. **Dodać analogiczną ochronę dla płatności PayU**
   - W `supabase/functions/create-event-order/index.ts` doprecyzuję istniejącą blokadę, żeby też respektowała `account_deleted_at IS NULL` i nie pozwalała użytkownikowi utworzyć kolejnego aktywnego zamówienia.

6. **Opcjonalna kontrola formularza bezpośredniego**
   - Jeśli wydarzenie ma też link `/event-form/...`, `EventFormPublicPage` dostanie sprawdzenie istniejącej rezerwacji dla zalogowanego użytkownika i zamiast formularza pokaże komunikat, że miejsce jest już zarezerwowane.

## Efekt

Dla Józefa Pyzy / gościa PLC po pierwszej aktywnej rezerwacji:
- przycisk rejestracji nie pozwoli otworzyć formularza,
- drawer nie pokaże pól rejestracyjnych nawet przy opóźnionym odczycie,
- edge function nie utworzy kolejnego zamówienia nawet przy obejściu frontendu,
- komunikat będzie jednoznaczny: „Masz już rezerwację na to wydarzenie”.