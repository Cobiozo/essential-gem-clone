## Diagnoza

1. **Rezerwacja została zapisana w bazie**
   - Zamówienie dla `sebastiansnopek87+freetest2@gmail.com` istnieje w `paid_event_orders`.
   - Status: `awaiting_email_confirmation`.
   - To oznacza: rezerwacja po kliknięciu „Zarezerwuj miejsce” działa, ale panel admina nie pokazuje tego stanu czytelnie / może korzystać ze starego cache.

2. **Kliknięcie CTA z maila kieruje do logowania, bo brakuje trasy publicznej**
   - Email prowadzi na: `/free-event/confirm/:token`.
   - Strona `FreeEventConfirmPage` już istnieje i ma poprawny baner sukcesu.
   - Problem: ta trasa nie jest podpięta w `App.tsx`, a specjalny „fast path” dla linków z maili obsługuje tylko `/event-form/confirm/...` i `/event-form/cancel/...`.
   - Efekt: gość wpada w pełne drzewo aplikacji z auth guardem i widzi logowanie.

3. **Szablon biletu istnieje, ale nie jest widoczny w panelu**
   - Komponent `EventTicketTemplatePanel` jest już zbudowany: upload tła PNG/JPG, pozycjonowanie pól, QR, zapis i podgląd PDF.
   - Tabela `event_ticket_templates` też istnieje.
   - Problem: panel nie jest nigdzie podpięty w edytorze wydarzenia.
   - Obecny model to **jeden szablon biletu na wydarzenie**, nie osobny szablon dla każdego typu biletu.

## Plan naprawy

1. **Naprawić publiczny link potwierdzenia bez logowania**
   - Dodać import `FreeEventConfirmPage` w `App.tsx`.
   - Dodać trasę `/free-event/confirm/:token` do publicznego `EmailLinkFastPath`.
   - Dodać `/free-event/confirm/...` do warunku `isEmailLink`, żeby link z maila omijał AuthProvider, MFA i redirect do logowania.
   - Po kliknięciu CTA użytkownik zobaczy baner: email potwierdzony, bilet z QR zostanie wysłany / został wysłany.

2. **Poprawić zakładkę Eventy → Zamówienia**
   - Dodać status `awaiting_email_confirmation` jako „Oczekuje na potwierdzenie email”.
   - Pokazać go w filtrze statusów i statystykach.
   - Oznaczyć zamówienia bezpłatne jako `Bezpłatne / Rezerwacja` zamiast traktować je jak zwykłą płatność.
   - Ustawić odświeżanie / brak długiego cache dla listy zamówień, żeby nowe rezerwacje pojawiały się od razu po wejściu w zakładkę.
   - W eksporcie Excel dodać informację o statusie potwierdzenia email.

3. **Podpiąć edytor szablonu biletu do wydarzenia**
   - W edytorze wydarzenia dodać osobną zakładkę „Szablon biletu”.
   - Podpiąć istniejący `EventTicketTemplatePanel`.
   - Dzięki temu miejsce konfiguracji będzie: **Admin → Eventy → Wydarzenia → Edytuj wydarzenie → Szablon biletu**.
   - Szablon będzie automatycznie przypisany do aktualnie edytowanego wydarzenia przez `event_id`.

4. **Zweryfikować pełny cykl**
   - Sprawdzić, że zamówienie bezpłatne widnieje w Zamówieniach ze statusem oczekiwania na email.
   - Sprawdzić kliknięcie `/free-event/confirm/:token` bez zalogowania.
   - Sprawdzić, że po potwierdzeniu status zmienia się na `paid`, generuje się `ticket_code`, tworzy się uczestnik i wysyłany jest email z biletem.
   - Sprawdzić, że edytor szablonu biletu zapisuje konfigurację i podgląd PDF korzysta z tego szablonu.