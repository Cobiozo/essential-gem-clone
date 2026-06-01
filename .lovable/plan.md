## Cel
Dla wydarzeń bezpłatnych kliknięcie CTA w mailu ma:
- pokazać krótki ekran potwierdzenia bez tekstu o płatności,
- zaktualizować istniejące zgłoszenie tego samego gościa jako potwierdzone/opłacone,
- nie pokazywać drugiego wiersza tego samego gościa w panelu formularza.

## Co zmienię
1. **Ekran po kliknięciu CTA z maila**
   - W `src/pages/EventFormConfirmPage.tsx` zmienię tekst dla wydarzeń bezpłatnych na dokładnie:
     - „Twoje dane i rejestracja zostały poprawnie potwierdzone”
     - „Na wskazany adres e-mail otrzymasz bilet uprawniający cię do uczestnictwa w wydarzeniu. Dziękujemy i do zobaczenia na wydarzeniu.”
   - Tekst „Teraz oczekujemy na płatność...” zostanie pokazany tylko dla wydarzeń płatnych.

2. **Edge Function `confirm-event-form-email`**
   - Usunę zachowanie, które przy darmowym formularzu tworzy nowe `paid_event_orders`, jeśli istnieje już zgłoszenie formularza.
   - Potwierdzenie darmowego wydarzenia będzie aktualizowało `event_form_submissions`: `email_status = confirmed`, `payment_status = paid`, `email_confirmed_at`.
   - Jeżeli bilet jest potrzebny technicznie do QR/PDF, powiążę go z istniejącym zgłoszeniem tak, aby panel nie traktował tego jako drugiego gościa.

3. **Lista zgłoszeń w adminie**
   - W `EventFormSubmissions.tsx` dopilnuję, żeby zamówienie/bilet tego samego e-maila dla tego samego wydarzenia było scalane z istniejącym zgłoszeniem, nawet jeśli w `submitted_data` historycznie brakuje `order_id`.
   - Efekt: jeden Jan Kowalski w tabeli, status „Opłacone” i „Potwierdził”, bez drugiego wiersza „Oczekuje”.

4. **Naprawa istniejącego przypadku ze screena**
   - Backfill dla już istniejących danych: zgłoszenie `tatanabacznosci@gmail.com` zostanie oznaczone jako potwierdzone/opłacone i powiązane z utworzonym biletem, żeby nie widniało jako duplikat.

## Weryfikacja
- Sprawdzę w bazie konkretny przypadek z maila `tatanabacznosci@gmail.com`.
- Wdrożę zaktualizowaną Edge Function.
- Potwierdzę, że panel formularza pokazuje jeden wpis tego gościa, a ekran potwierdzenia dla darmowego wydarzenia nie zawiera treści o płatności.