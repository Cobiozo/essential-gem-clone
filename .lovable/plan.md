Plan naprawy:

1. **Ukryć anulowane bilety w sekcji użytkownika**
   - W `Twoje bilety na to wydarzenie` zwykły zalogowany uczestnik zobaczy wyłącznie aktywny/opłacony bilet.
   - Pozycje `cancelled`, `refunded`, `failed`, `expired` nie będą renderowane w tej sekcji nawet wtedy, gdy użytkownik ma rolę admina i ogląda swoje bilety na stronie `/paid-events`.
   - Informacja `+7 anulowanych` zostanie usunięta z tej sekcji użytkownika.

2. **Otwierać dokładnie ten bilet, który został wysłany mailem**
   - Link przy przycisku `Otwórz bilet (QR)` będzie używał kodu biletu uczestnika z `paid_event_order_attendees.ticket_code`, jeśli istnieje.
   - Jeśli nie ma kodu uczestnika, użyje kodu zamówienia `paid_event_orders.ticket_code` jako fallback.
   - Dzięki temu link będzie zgodny z kodem QR/PDF-em wysłanym na maila.

3. **Naprawić stronę `/ticket/:code`, żeby rozpoznawała oba typy kodów**
   - `TicketPage` najpierw spróbuje znaleźć zamówienie po `paid_event_orders.ticket_code`.
   - Jeśli nie znajdzie, spróbuje znaleźć uczestnika po `paid_event_order_attendees.ticket_code` i przez `order_id` pobierze właściwe zamówienie.
   - To usunie błąd `Bilet niedostępny`, gdy użytkownik otwiera link z kodem uczestnika.

4. **Zachować widoczność historii dla administratora w panelu CMS**
   - Anulowane pozycje nadal będą widoczne wyłącznie w administracyjnym widoku zgłoszeń/formularzy, nie w sekcji użytkownika na wydarzeniu.

Technicznie zmienię tylko logikę frontendową w komponentach biletów i nie będę modyfikować bazy danych.