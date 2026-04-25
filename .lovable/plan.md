Znalazłem przyczynę: na produkcji ścieżki `/event-form/...` nadal są traktowane jak chronione i aplikacja pokazuje logowanie zamiast strony potwierdzenia/anulowania. Same funkcje backendowe odpowiadają poprawnie przy bezpośrednim wywołaniu, ale frontend na produkcji nie dopuszcza gościa do tych ekranów. Dodatkowo anulowanie obecnie jest blokowane, jeśli płatność ma status `paid`, więc kliknięcie linku anulowania dla Jana nie zmieni statusu na anulowany.

Plan naprawy:

1. Dodać niezależny publiczny „szybki routing” dla linków mailowych
   - W `src/App.tsx` wykryć na samym początku ścieżki:
     - `/event-form/confirm/:token`
     - `/event-form/cancel/:token`
   - Dla tych dwóch ścieżek renderować strony confirm/cancel bez `AuthProvider`, `ProfileCompletionGuard`, MFA, dashboard redirectów i globalnej logiki sesji.
   - Dzięki temu gość po kliknięciu w mailu zawsze zobaczy komunikat, nawet jeśli produkcyjna sesja jest pusta, wygasła albo ma uszkodzony refresh token.

2. Ustabilizować publiczne ścieżki event-form
   - Uzupełnić listy „known/public routes” tak, aby `/event-form` nie było nigdy interpretowane jako strona partnerska ani chroniona część panelu.
   - Zachować normalne działanie formularza `/event-form/:slug` i stron wydarzeń.

3. Naprawić anulowanie z maila dla opłaconych zgłoszeń
   - Zmienić logikę RPC `cancel_event_form_submission`, żeby kliknięcie przez gościa oznaczało zgłoszenie jako anulowane także przy `payment_status = paid`.
   - Status płatności pozostanie `paid`, żeby admin widział, że bilet był opłacony, a anulowanie nie oznacza zwrotu środków.
   - Ustawić `status = cancelled`, `cancelled_at`, `cancelled_by = guest`; wtedy panel admina pokaże „Anulował (gość)”.

4. Poprawić komunikat na stronie anulowania
   - Jeśli zgłoszenie było opłacone, strona pokaże jasny komunikat: rejestracja anulowana, środki za bilet nie są automatycznie zwracane zgodnie z informacją w mailu/formularzu.
   - Admin i partner nadal dostaną powiadomienia tylko przy pierwszym skutecznym anulowaniu.

5. Wdrożyć i sprawdzić backend
   - Dodać migrację SQL aktualizującą funkcję anulowania.
   - Wdrożyć zaktualizowane funkcje `confirm-event-form-email` i `cancel-event-form-submission`, jeśli zmiany w nich będą potrzebne po dostosowaniu odpowiedzi.
   - Przetestować bezpośrednio funkcje dla błędnego tokenu i potwierdzić, że odpowiadają publicznie bez logowania.

6. Finalna weryfikacja
   - Sprawdzić produkcyjne ścieżki diagnostyczne:
     - `/event-form/confirm/test-token-diagnostic`
     - `/event-form/cancel/test-token-diagnostic`
   - Oczekiwany efekt: zamiast logowania widoczna będzie karta z komunikatem błędu tokenu / ekran anulowania.
   - Po publikacji frontendu linki z maili zaczną pokazywać komunikat potwierdzenia/anulowania na stronie, a panel admina zacznie widzieć kliknięcia anulowania jako „Anulował (gość)”.

Ważne: zmiana backendu zadziała od razu po migracji/wdrożeniu funkcji, ale zmiana przekierowania na produkcji wymaga opublikowania frontendu, bo problem z logowaniem jest w produkcyjnej wersji aplikacji.