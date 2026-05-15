## Problem

Panel „Twoje bilety na to wydarzenie" pokazuje 0 biletów i komunikat „Nie jesteś jeszcze zarejestrowany", mimo że zalogowany użytkownik faktycznie ma potwierdzone zamówienia (w tym rezerwację gościa).

Przyczyna: w `MyEventTicketsInline.tsx` zapytanie do `paid_event_orders` filtruje **wyłącznie** po `user_id = auth.uid()`:

```ts
.eq('user_id', user!.id)
.eq('event_id', eventId)
```

Tymczasem polityka RLS i intencja produktu pozwalają widzieć własne zamówienia także przez dopasowanie e-maila zalogowanego konta:

```
user_id = auth.uid() OR email = (auth.users.email of auth.uid()) OR is_admin()
```

W bazie istnieją zamówienia dla obu kont Sebastiana (`sebastiansnopek.eqology@gmail.com` i `sebastiansnopek87@gmail.com`). Jeśli rezerwacja powstała na e-mail, ale `user_id` w zamówieniu odpowiada innemu kontu (lub jest puste, np. checkout gościa później dowiązany do konta), filtr `eq('user_id', …)` je gubi.

## Zakres zmian

Tylko frontend, jeden plik: `src/components/paid-events/MyEventTicketsInline.tsx`. Bez zmian w bazie, RLS, edge functions i innych panelach.

## Co zostanie zmienione

1. Pobieranie e-maila zalogowanego użytkownika z `useAuth()` (`user.email`) i znormalizowanie go do lowercase.

2. Zmiana filtru zapytania z twardego `eq('user_id', …)` na warunek odpowiadający RLS — dopasowanie po `user_id` lub po `email`:

   ```ts
   let q = supabase
     .from('paid_event_orders')
     .select(`… (jak dotąd) …`)
     .eq('event_id', eventId)
     .order('created_at', { ascending: false });

   const email = user?.email?.toLowerCase() ?? null;
   if (email) {
     q = q.or(`user_id.eq.${user!.id},email.eq.${email}`);
   } else {
     q = q.eq('user_id', user!.id);
   }
   ```

   RLS i tak ograniczy zwracane wiersze do tych, do których użytkownik ma dostęp, więc dopisanie `email` po stronie klienta nie poszerza widoczności poza politykę.

3. Deduplikacja po `id` zamówienia w wyniku (na wypadek gdyby `or` zwrócił to samo zamówienie dwukrotnie — w praktyce nie powinno, ale tania asekuracja):

   ```ts
   const unique = Array.from(new Map((data ?? []).map((o: any) => [o.id, o])).values());
   ```

4. Sortowanie wyniku malejąco po `created_at` (pozostaje bez zmian — robi to baza).

5. `queryKey` rozszerzyć o `email`, żeby cache nie mieszał wyników między kontami:
   `['my-event-tickets-inline', user?.id, email, eventId]`.

## Co pozostaje bez zmian

- Cała sekcja prezentacyjna (pasek „Jesteś zarejestrowany…", lista zamówień, dialog edycji uczestnika, badge statusów, liczniki `activeTickets`/`activeSeats`/`inactiveTickets`).
- Sekcja „Pokaż zapisanych przez mój link" i `MyEventFormLinks`.
- Polityki RLS na `paid_event_orders` i `paid_event_order_attendees`.

## Efekt

Po zmianie panel pokaże wszystkie zamówienia (zarezerwowane, oczekujące, opłacone, potwierdzone itd.) powiązane z zalogowanym kontem zarówno przez `user_id`, jak i przez e-mail. W konsekwencji pasek nad panelem poprawnie wykryje rejestrację i wyświetli liczbę zarezerwowanych miejsc oraz status najnowszego zamówienia, zamiast komunikatu „Nie jesteś jeszcze zarejestrowany".

## Poza zakresem

- Łączenie/migrowanie wielu kont użytkownika o różnych e-mailach (`sebastian…eqology` vs `sebastian…87`) — to decyzja produktowa, nie ten ticket.
- Zmiany w przepływie potwierdzania e-mailem i statusach (`awaiting_transfer` → `paid` itd.).
