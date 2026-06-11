Plan naprawy:

1. Ujednolicić wykrywanie istniejącej rezerwacji
- W `useHasOwnEventTicket` użyć tego samego źródła prawdy, które już poprawnie pokazuje panel „Jesteś zarejestrowany” (`get_my_event_orders` + fallbacki).
- Dodać wariant fallback, który liczy rezerwację także wtedy, gdy zamówienie jest widoczne po `user_id`, po adresie e-mail albo użytkownik występuje jako uczestnik biletu grupowego.
- Nie uzależniać blokady od problematycznego odczytu pojedynczych tabel, jeśli RPC zwróci już aktywną rezerwację.

2. Zablokować przycisk i otwieranie formularza w czasie sprawdzania
- Na stronie wydarzenia dopóki trwa sprawdzanie rezerwacji zalogowanego użytkownika, CTA „Zapisz się” nie może otworzyć formularza.
- Sidebar dostanie stan `alreadyRegisteredLoading`; przycisk będzie chwilowo nieaktywny z tekstem „Sprawdzam rezerwację…”.

3. Dodać twardą blokadę w `PurchaseDrawer`
- Drawer dostanie informację z rodzica: `alreadyRegistered` i `alreadyRegisteredLoading`.
- Jeśli użytkownik ma już rezerwację, formularz kupującego nie będzie renderowany w ogóle — tylko komunikat „Masz już rezerwację”.
- Dla zalogowanego nie-admina kliknięcie submit zostanie zablokowane również na podstawie tej flagi z rodzica, nie tylko lokalnego zapytania drawera.

4. Usunąć ścieżkę „kupuję dla gości” z formularza
- Jeżeli użytkownik ma już własną rezerwację, drawer nie pozwoli tworzyć kolejnej rezerwacji ani dla siebie, ani jako zamówienia z dodatkowymi gośćmi.
- Zapraszanie gości zostaje wyłącznie przez link zapraszający i tylko gdy admin włączy `allow_attendee_invites`.

5. Spójność po udanej rezerwacji
- Po utworzeniu rezerwacji invalidować oba klucze zapytań: panel biletów i blokadę CTA.
- Po odświeżeniu danych przycisk „Zapisz się” ma zostać zastąpiony komunikatem „Masz już rezerwację”.

Zakres techniczny:
- `src/hooks/useHasOwnEventTicket.ts`
- `src/pages/PaidEventPage.tsx`
- `src/components/paid-events/public/PaidEventSidebar.tsx`
- `src/components/paid-events/public/PurchaseDrawer.tsx`

Efekt końcowy:
- Józef Pyza oraz każda inna rola zalogowana z aktywną rezerwacją nie może ponownie otworzyć formularza ani złożyć drugiej rezerwacji na to samo wydarzenie.
- Informacja o istniejącej rezerwacji pojawia się zamiast możliwości zapisu.