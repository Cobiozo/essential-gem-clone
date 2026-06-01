Problem nie wynika z tego, że użytkownik faktycznie zarejestrował się drugi raz przez formularz, tylko z obecnego przepływu dla wydarzeń bezpłatnych:

- istnieje wpis w `event_form_submissions` utworzony przy rejestracji gościa,
- po kliknięciu „potwierdzam adres email” funkcja `confirm-event-form-email` tworzy dodatkowy rekord w `paid_event_orders`, żeby wygenerować bilet PDF/QR,
- panel „Formularze → Zgłoszenia” dokleja do jednej tabeli zarówno `event_form_submissions`, jak i `paid_event_orders`, więc ta sama osoba pojawia się dwa razy: raz jako zgłoszenie, raz jako zamówienie/bilet.

Plan naprawy:

1. Poprawić logikę potwierdzania darmowego wydarzenia
   - W `supabase/functions/confirm-event-form-email/index.ts` po potwierdzeniu e-maila dla wydarzenia bezpłatnego istniejące zgłoszenie ma zostać zaktualizowane jako właściwy rekord gościa:
     - `email_status = confirmed`,
     - `payment_status = paid`,
     - `submitted_data.order_id` / `submitted_data.order_ids` wskazuje powiązany bilet/zamówienie.
   - Jeśli zamówienie/bilet już istnieje dla tego zgłoszenia albo tego samego `event_id + email`, funkcja ma go użyć, a nie tworzyć kolejnego.

2. Ukryć techniczny rekord biletu jako osobny „kontakt” w tabeli zgłoszeń
   - W `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` odfiltruję z listy `paid_event_orders` te zamówienia, które są już powiązane z istniejącym zgłoszeniem przez `submitted_data.order_id` albo `submitted_data.order_ids`.
   - Dzięki temu gość będzie widoczny tylko raz, jako jedna osoba/rejestracja.

3. Pokazać poprawny status na jednym wierszu
   - Dla zgłoszenia powiązanego z darmowym biletem panel ma pokazywać status „Opłacone” i „Potwierdził”, a nie drugi wiersz z „Oczekuje”.
   - Akcje biletu pozostaną dostępne przez powiązane `order_id`, bez tworzenia osobnego wiersza dla tej samej osoby.

4. Posprzątać istniejący przypadek zduplikowany w bazie
   - Zaktualizuję istniejące zgłoszenia, które mają `submitted_data.order_id`, aby status zgłoszenia był zgodny z powiązanym zamówieniem.
   - Nie będę usuwać biletu/zamówienia, bo jest potrzebne technicznie do PDF/QR; usunięte zostanie jedynie jego osobne wyświetlanie jako drugi gość.

Efekt końcowy:
- kliknięcie linku potwierdzającego nie będzie tworzyć drugiej widocznej osoby w zgłoszeniach,
- ta sama osoba pozostanie jednym gościem,
- zmieni się tylko status tej rejestracji na potwierdzony e-mail i opłacone dla darmowego wydarzenia.