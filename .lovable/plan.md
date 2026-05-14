
## Cel

1. Kupujący zawsze widzi swoje zamówienia bilet po bilecie — z liczbą biletów, kwotą i listą uczestników (z możliwością uzupełnienia danych).
2. Naprawić ścieżkę zapisu quantity > 1 (Twoje ostatnie zamówienie ma quantity=1, total=35 zł i 0 uczestników w `paid_event_order_attendees` — coś po drodze się gubi).

## Diagnoza obecnego stanu

- `paid_event_orders` dla Twojego maila — wszystkie ostatnie rekordy mają quantity=1 i total=3500 gr.
- `paid_event_order_attendees` — 0 wierszy dla każdego z tych zamówień.
- Brak logów edge function `register-event-transfer-order` w analytics → funkcja prawdopodobnie nie była przedeploy'owana po ostatnich zmianach albo wywołanie wraca błędem przed insertem attendees.
- W UI nie ma żadnego widoku „moich zamówień" — `MyEventFormReferrals` pokazuje tylko `event_form_submissions` (zapisy przez link partnerski), nie zakupy biletów.

## Zakres zmian

### 1. Diagnostyka i fix zapisu quantity (backend + frontend)

**`PurchaseDrawer.tsx`**
- Dodać `console.log('[purchase] payload', payload)` tuż przed `invoke` — łatwa weryfikacja w konsoli przeglądarki, czy quantity=2 faktycznie wychodzi z UI.
- Po sukcesie pobrać świeży rekord z bazy (`paid_event_orders` + `paid_event_order_attendees` po `order.id`) i pokazać w ekranie sukcesu RZECZYWISTE wartości z bazy (nie z lokalnego state'u). Dzięki temu od razu widać, czy zapis był prawidłowy.

**`register-event-transfer-order/index.ts` i `payu-create-order/index.ts`**
- Twardy log na wejściu: `console.log('[order] received', { quantity, attendeesLen: attendeesInput.length, totalSeats })`.
- Po insercie attendees: weryfikacja `select count(*) from paid_event_order_attendees where order_id=...` i log z porównaniem `expected vs actual`.
- Jeśli `attendeeRows.length !== totalSeats` — zwrócić w odpowiedzi `warning: 'attendees_mismatch'`, żeby UI mógł to ujawnić.
- Redeploy obu funkcji (najczęstsza przyczyna „naprawiłem ale nic się nie zmieniło").

### 2. Nowa sekcja „Moje bilety" na `/paid-events`

Nowy komponent `MyTicketOrders.tsx` osadzony na górze `PaidEventsListPage`, pod nagłówkiem strony. Widoczny dla każdego zalogowanego użytkownika.

**Co pokazuje (per zamówienie):**
- Tytuł wydarzenia + data + lokalizacja (JOIN do `paid_events`)
- Bilet: nazwa, liczba biletów, łączna kwota, status płatności (badge: Oczekuje płatności / Opłacone / Anulowane)
- Sposób płatności (PayU / Przelew) + jeśli przelew + status oczekujący → przycisk „Pokaż dane do przelewu"
- Lista uczestników z `paid_event_order_attendees` (np. „1. Sebastian Snopek (kupujący)", „2. Uczestnik #2 — uzupełnij dane")
- Przy każdym uczestniku innym niż kupujący — przycisk „Edytuj dane uczestnika" otwierający mały dialog z polami imię/nazwisko/email; zapis do `paid_event_order_attendees` (z RLS: tylko właściciel zamówienia po e-mailu zalogowanego usera).

**Zapytanie:**
```ts
supabase.from('paid_event_orders')
  .select('id, quantity, total_amount, status, payment_provider, ticket:paid_event_tickets(name, price_pln, seats_per_ticket), event:paid_events(title, slug, event_date, location), attendees:paid_event_order_attendees(id, seat_index, first_name, last_name, email, ticket_code)')
  .eq('email', user.email).order('created_at', desc)
```

### 3. RLS dla `paid_event_orders` i `paid_event_order_attendees`

Dodać/zweryfikować polityki:
- SELECT na `paid_event_orders`: `email = (auth.jwt() ->> 'email')` (kupujący widzi swoje zamówienia po e-mailu, niezależnie od tego, że gość może też kupować).
- SELECT/UPDATE na `paid_event_order_attendees`: dozwolone gdy `order_id` należy do zamówienia o `email = (auth.jwt() ->> 'email')`. UPDATE ograniczony do kolumn `first_name`, `last_name`, `email` (przez politykę WITH CHECK + brak grant na pozostałe lub trigger blokujący zmianę `seat_index`/`ticket_code`).

### 4. Niewidoczne dla obecnej sesji rekordy ze starych zamówień

Stare zamówienia (np. z 14.05 19:46) mają quantity=1 — po naprawie nowe zamówienia będą poprawne, ale tego konkretnego rekordu nie modyfikujemy (po stronie UX po prostu pokaże 1 bilet z 1 uczestnikiem). Jeżeli chcesz, mogę osobno dopisać ten rekord ręcznie do quantity=2 + dorzucić attendee — wymagałoby to migracji danych i Twojego potwierdzenia.

## Pliki

- `src/components/paid-events/PurchaseDrawer.tsx` (logi + odczyt po sukcesie)
- `src/components/paid-events/MyTicketOrders.tsx` (nowy)
- `src/components/paid-events/MyTicketOrderAttendeeEditDialog.tsx` (nowy)
- `src/pages/PaidEventsListPage.tsx` (osadzenie sekcji)
- `supabase/functions/register-event-transfer-order/index.ts` (logi + warning)
- `supabase/functions/payu-create-order/index.ts` (logi + warning)
- migracja SQL: polityki RLS na `paid_event_orders` i `paid_event_order_attendees`

## Poza zakresem

- Zmiany w `event_form_submissions` (panel partnera).
- Email — był już naprawiany w poprzedniej iteracji.
- Migracja istniejących zamówień (ręczna korekta starych rekordów) — osobna decyzja.
