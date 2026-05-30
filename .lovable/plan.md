Plan naprawy:

1. Zmienię przycisk „Przejdź do płatności” w `PurchaseDrawer`, żeby nie wywoływał już bezpośrednio PayU. Zamiast tego utworzy zamówienie przez `create-event-order`, zamknie drawer zakupu i przeniesie klienta na `/checkout/:orderId`.

2. Podepnę brakujące trasy w `App.tsx`:
   - `/checkout/:orderId` — ekran wyboru płatności,
   - `/ticket/:code` — publiczny podgląd/status biletu,
   - `/admin/payments` — panel konfiguracji PayU dla admina.

3. Zaktualizuję `ProfileCompletionGuard`, żeby `/checkout` i `/ticket` były publiczne i nie blokowały klientów logowaniem ani uzupełnianiem profilu.

4. Dopasuję ekran `/checkout/:orderId` do załączonego przykładu: jedna strona/okno z radiobuttonami metod płatności, opisem przelewu bankowego, PayU, BLIK oraz przyciskiem „Kupuję i płacę”.

5. Naprawię obsługę przelewu tradycyjnego w nowym przepływie: klient wybiera przelew na ekranie płatności i przechodzi do statusu zamówienia z instrukcjami, zamiast tworzyć osobny stary typ rejestracji.

6. Sprawdzę Edge Function `payu-create-order` pod kątem przyczyn statusu non-2xx i poprawię komunikat błędu tak, aby użytkownik widział konkretną przyczynę zamiast ogólnego „Edge Function returned…”.

7. Po zmianach zweryfikuję przepływ: kliknięcie w drawerze → utworzenie zamówienia → wejście na checkout → wybór metody płatności → poprawna akcja dla PayU/BLIK/przelewu.