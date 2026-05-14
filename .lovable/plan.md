## Plan naprawy

1. **Naprawić zapis zakupu 2 biletów**
   - Wymusić, żeby `PurchaseDrawer` zawsze wysyłał aktualną liczbę biletów i blokował wysłanie, jeśli backend zapisał inną ilość.
   - Po zakupie odświeżać dane `Moje bilety`, żeby sekcja pojawiła się od razu bez ręcznego przeładowania.

2. **Naprawić mail po zakupie przelewem**
   - Zaktualizować `register-event-transfer-order`, aby email budował treść wyłącznie z realnie zapisanego zamówienia (`quantity`, `total_amount`) i zapisanych uczestników, nie z domyślnej wartości `1`.
   - Poprawić mirror do `event_form_submissions`: zamiast `quantity: 1` zapisywać faktyczną liczbę biletów, faktyczną kwotę i listę `order_ids`.
   - W treści maila pokazać: `Liczba biletów: 2 × 35,00 zł`, `Kwota do zapłaty: 70,00 zł` oraz listę uczestników/gości.

3. **Naprawić brak rekordów uczestników**
   - Przy tworzeniu zamówienia uczestnicy muszą zapisywać się jako rekordy w `paid_event_order_attendees`; jeśli insert uczestników się nie uda, funkcja nie może po cichu wysyłać błędnego maila.
   - Dodać czytelny błąd/log i przerwać zakup, jeśli liczba zapisanych uczestników nie zgadza się z liczbą biletów.

4. **Widoczność w sekcji z ekranu („Pokaż zapisanych”)**
   - Rozszerzyć `MyEventFormReferrals`, żeby przy zgłoszeniu z zakupu biletów pokazywał dane z powiązanych `paid_event_orders` i `paid_event_order_attendees`.
   - Przy Twoim własnym zakupie jako partner pokazać Ciebie jako kupującego/uczestnika oraz liczbę i kwotę zakupionych biletów.
   - Jeśli kupujesz kolejne bilety już po posiadaniu własnego biletu, w tej liście pokazać gości z możliwością rozpoznania, które dane trzeba uzupełnić.

5. **Sekcja „Moje bilety”**
   - Upewnić się, że na `/paid-events` nie znika przy pustej liście przez RLS lub brak uczestników.
   - Dla zamówień bez rekordów uczestników pokazać zamówienie i komunikat do uzupełnienia/naprawy, zamiast ukrywać całą sekcję.

6. **Naprawa istniejących błędnych danych**
   - Przygotować operację danych dla Twoich najnowszych błędnych zamówień: zamówienie, które miało być na 2 bilety, ustawić na `quantity = 2`, `total_amount = 7000`, oraz utworzyć brakujące rekordy uczestników.
   - Zsynchronizować `event_form_submissions.submitted_data`, aby panel „Pokaż zapisanych” i maile odzwierciedlały 2 bilety.

## Technicznie

- Pliki do zmiany: `PurchaseDrawer.tsx`, `MyTicketOrders.tsx`, `MyEventFormReferrals.tsx`, `register-event-transfer-order/index.ts`.
- Możliwa migracja/operacja SQL: uzupełnienie brakujących uczestników oraz naprawa konkretnych istniejących zamówień.
- Po zmianach trzeba wdrożyć `register-event-transfer-order`; poprzednia próba wdrożenia funkcji miała limit funkcji Supabase, więc jeśli limit nadal blokuje deploy, trzeba będzie usunąć nieużywaną funkcję albo wdrożyć tylko tę jedną krytyczną funkcję.