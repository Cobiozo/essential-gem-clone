## Plan naprawy

1. **Ujednolicić wykrywanie istniejącej rejestracji w `PurchaseDrawer.tsx`**
   - Obecny formularz sprawdza tylko `paid_event_orders`, dlatego nie przełącza się w tryb „gość/uczestnik”, jeśli użytkownik jest widoczny jako zarejestrowany przez fallback `event_form_submissions`.
   - Dodam dodatkowe sprawdzenie `event_form_submissions` po adresach e-mail użytkownika/profilu, tak jak robi to panel „Twoje bilety na to wydarzenie”.
   - `hasOwnTicket` będzie prawdziwe, jeśli istnieje aktywne zamówienie albo aktywne zgłoszenie formularzowe dla tego wydarzenia.

2. **Zablokować autouzupełnianie i ponowną rejestrację użytkownika**
   - Gdy `hasOwnTicket === true`, formularz „Dane kupującego” pozostanie ukryty/zastąpiony informacją o blokadzie.
   - Pola kupującego będą czyszczone ponownie po otwarciu drawer’a, zmianie liczby biletów i po przełączeniu statusu rejestracji.
   - Dodam defensywną ochronę w submit/build payload: w trybie „już zarejestrowany” kupujący nie będzie dodawany jako uczestnik, a wszystkie bilety trafią wyłącznie do gości.

3. **Dopasować teksty akcji do trybu gości**
   - W trybie `hasOwnTicket` przycisk przelewu nie powinien mówić „Zarejestruj mnie”, tylko np. „Zarejestruj gości i wyślij dane do przelewu”.
   - Komunikat w formularzu pozostanie jasny: użytkownik jest już zapisany, kolejne bilety są tylko dla zapraszanych gości.

4. **Zostawić istniejące podsumowanie kosztów**
   - Obecna kalkulacja `quantity × cena = suma` zostaje, ale będzie działała już w poprawnym trybie „bilety dla gości”, bo naprawione zostanie samo wykrywanie rejestracji.

## Szczegóły techniczne

- Zmiana dotyczy tylko frontendu: `src/components/paid-events/public/PurchaseDrawer.tsx`.
- Nie zmieniam schematu bazy, RLS ani Edge Functions.
- Po wdrożeniu sprawdzę, czy warunek `hasOwnTicket` może uwzględniać oba źródła: `paid_event_orders` i `event_form_submissions`, zgodnie z istniejącym `MyEventTicketsInline.tsx`.