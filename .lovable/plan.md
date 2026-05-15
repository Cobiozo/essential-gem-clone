## Plan naprawy

1. **Poprawię źródło danych w `MyEventTicketsInline.tsx`**
   - Widok będzie pobierał zamówienia po aktualnym `auth.uid()` oraz po e-mailu zalogowanego użytkownika.
   - Dodatkowo użyje danych z `profile.email`, bo w tym projekcie profile i sesja auth bywają rozdzielone.
   - Zapytanie będzie uwzględniało statusy typu `awaiting_transfer`, `pending`, `paid`, `completed`, a nie tylko bilety opłacone.

2. **Dodam bezpieczny fallback na potwierdzoną rejestrację formularzową**
   - Jeśli użytkownik ma wpis w `event_form_submissions` z potwierdzonym e-mailem, ale nie uda się jeszcze odczytać zamówień z `paid_event_orders`, komunikat nie będzie już mówił „Nie jesteś zarejestrowany”.
   - Zamiast tego pokaże, że rejestracja została potwierdzona i poda jej status.

3. **Odświeżę panel natychmiast po zapisie**
   - Po udanej rezerwacji przelewem unieważnię również cache `my-event-tickets-inline`, nie tylko `my-ticket-orders`.
   - Dzięki temu komunikat nad zakładką „Twoje bilety na to wydarzenie” zmieni się od razu po zapisie, bez ręcznego odświeżania strony.

4. **Ujednolicę logikę „mam już bilet” w drawerze zakupu**
   - Sprawdzanie istniejącej rezerwacji będzie używało tych samych identyfikatorów: `user.id`, `profile.user_id`, `user.email`, `profile.email`.
   - To zapobiegnie sytuacji, w której system wie, że masz bilet podczas zakupu, ale panel pod wydarzeniem go nie pokazuje.

## Szczegóły techniczne

- Pliki do zmiany:
  - `src/components/paid-events/MyEventTicketsInline.tsx`
  - `src/components/paid-events/public/PurchaseDrawer.tsx`
- Nie zmieniam struktury bazy ani RLS w tym kroku, bo dane zamówień istnieją i polityka już pozwala właścicielowi odczytać zamówienia po `user_id` lub e-mailu.
- Po wdrożeniu sprawdzę zapytania w przeglądarce i potwierdzę, że panel nie pokazuje błędnego komunikatu „Nie jesteś jeszcze zarejestrowany” dla istniejącej rejestracji.