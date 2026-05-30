# Łącze PayPal per bilet

## Cel
Każdy bilet (`paid_event_tickets`) może mieć opcjonalne łącze PayPal (np. `https://www.paypal.com/ncp/payment/PAVHPCA68FL8S`). Gdy łącze jest ustawione, klient w trakcie zakupu może wybrać „Zapłać przez PayPal" i zostaje przekierowany na PayPal — bez integracji API, jako prosty link.

## Zmiany

### 1. Baza danych (migracja)
- Dodać kolumnę `paypal_payment_link TEXT NULL` w `paid_event_tickets`.
- Walidacja po stronie aplikacji (link musi zaczynać się od `https://`); brak zmian w RLS / GRANT (kolumna dziedziczy istniejące polityki).

### 2. Panel admina — `EventTicketsPanel.tsx`
Po polu „Cena (PLN)" dodać nowe pole:
- Label: „Łącze do płatności PayPal (opcjonalne)"
- Input typu URL, placeholder: `https://www.paypal.com/ncp/payment/XXXXX`
- Pomocniczy tekst: „Jeśli wypełnione, klient zobaczy dodatkową opcję płatności PayPal i zostanie przekierowany na to łącze."
- Zapis przez istniejący `updateMutation` (nowe pole `paypal_payment_link` w typie `Ticket`).

### 3. Drawer zakupu — `PurchaseDrawer.tsx`
- Pobrać `paypal_payment_link` razem z biletem.
- Jeżeli aktywny bilet ma `paypal_payment_link`, w sekcji wyboru metody płatności pojawia się trzecia opcja: „PayPal" (z ikoną/etykietą).
- Po wyborze PayPal przycisk „Przejdź do płatności" zmienia tekst na „Zapłać przez PayPal". Klik:
  1. tworzy zamówienie (status `pending`, `payment_provider: 'paypal_link'`, `payment_method: 'paypal_link'`) przez istniejący endpoint `create-event-order` (rozszerzony o przyjmowanie metody `paypal_link`),
  2. otwiera `paypal_payment_link` w nowej karcie i pokazuje stronę dziękczynną z informacją: „Po opłaceniu wyślij potwierdzenie na adres organizatora — bilet zostanie aktywowany ręcznie.".
- Łącze PayPal jest niezależne od statusu PayU (działa nawet gdy PayU jest wyłączony).

### 4. Strona checkout — `CheckoutPage.tsx`
- Analogicznie do (3): jeśli `paid_event_tickets.paypal_payment_link` istnieje, dodać `RadioGroupItem` „PayPal".
- Opcja PayPal nigdy nie jest blokowana flagą `!payuReady`.
- Przy wyborze PayPal przycisk „Kupuję i płacę" → otwiera `paypal_payment_link`, aktualizuje zamówienie (`payment_method: 'paypal_link'`), przekierowuje na stronę informacyjną o oczekiwaniu na ręczne potwierdzenie.

### 5. Edge function `create-event-order`
- Dopuścić `payment_method = 'paypal_link'` i zapisać `payment_provider = 'paypal_link'`. Brak wywołań do PayPal API — to tylko link.

### 6. Panel admina — zamówienia
- Lista zamówień (`AdminEventOrders`/podobne) — dodać badge „PayPal (ręczne)" dla zamówień z `payment_method = 'paypal_link'`, aby admin wiedział, że trzeba potwierdzić wpłatę ręcznie (istniejący przycisk „Oznacz jako opłacone" już działa).

## Szczegóły techniczne
- Typ `Ticket` w `EventTicketsPanel.tsx` i `PurchaseDrawer.tsx`: dodać `paypal_payment_link: string | null`.
- `src/integrations/supabase/types.ts` — regeneracja po migracji.
- Walidacja URL po stronie panelu admina: prosty regex `^https:\/\/.+`.
- Brak zmian w `payu-*` funkcjach.

## Co NIE wchodzi w zakres
- Integracja z PayPal API (webhook / weryfikacja płatności) — to jest tylko czysty link „Smart Payment Button" / NCP, więc potwierdzenie pozostaje ręczne (admin oznacza zamówienie jako opłacone w panelu).
