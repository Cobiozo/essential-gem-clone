Aktualnie po kliknięciu „Przejdź do płatności” aplikacja nie otwiera od razu ekranu PayU ze screena. Ten przycisk tworzy zamówienie i przenosi na wewnętrzny ekran `/checkout/:orderId`, gdzie dopiero trzeba wybrać PayU, zaakceptować regulamin i kliknąć „Kupuję i płacę”. Dopiero wtedy `payu-create-order` zwraca `redirectUri` i następuje przejście do hostowanego okna PayU.

Plan zmiany:

1. Zmienić flow w `PurchaseDrawer.tsx`
   - Po kliknięciu „Przejdź do płatności”, jeśli dla wydarzenia aktywne jest PayU, aplikacja po utworzeniu zamówienia od razu wywoła `payu-create-order`.
   - Jeśli PayU zwróci `redirectUri`, użytkownik zostanie natychmiast przekierowany na ekran PayU jak na załączonym screenie.

2. Zachować fallback dla przelewu tradycyjnego
   - Jeśli wydarzenie ma tylko przelew bankowy bez PayU, zostawić przejście do `/checkout/:orderId`, bo ten ekran pokazuje dane do przelewu.
   - Jeśli PayU nie jest poprawnie skonfigurowane albo zwróci błąd, pokazać czytelny komunikat zamiast cichego braku przekierowania.

3. Nie zmieniać panelu admina PayU
   - Konfiguracja i test połączenia w zakładce „Płatne wydarzenia” zostają bez zmian.
   - Zmiana dotyczy wyłącznie publicznego procesu zakupu biletu, żeby przycisk prowadził do rzeczywistego ekranu PayU.