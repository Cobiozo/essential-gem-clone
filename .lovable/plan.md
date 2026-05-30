## Problem

Link PayPal jest zapisany w bazie (zweryfikowane: bilet „Przedpłata" ma `paypal_payment_link = https://www.paypal.com/...`), ale opcja PayPal nie pojawia się na stronie `/checkout/:orderId`.

Kod w `CheckoutPage.tsx` wygląda poprawnie, więc najpewniejsza przyczyna to jeden z dwóch problemów:

1. **PostgREST zwraca `paid_event_tickets` jako tablicę (a nie obiekt)** w odpowiedzi embed'a — wtedy `order.paid_event_tickets?.paypal_payment_link` jest `undefined`, więc `hasPaypal = false`.
2. **Cache przeglądarki / testowanie na opublikowanej wersji** (`purelife.lovable.app`), na której najnowszy build z PayPal jeszcze nie został wypchnięty.

## Plan naprawy

### 1. `src/pages/CheckoutPage.tsx` — defensywne odczytywanie embed'a

Zmienić odczyt na taki, który działa zarówno dla obiektu jak i tablicy:

```ts
const ticketRow = Array.isArray(order?.paid_event_tickets)
  ? order.paid_event_tickets[0]
  : order?.paid_event_tickets;
const paypalLink = ticketRow?.paypal_payment_link?.trim() || null;
const hasPaypal = !!paypalLink && /^https?:\/\//i.test(paypalLink);
```

To samo zastosować w miejscach gdzie używane jest `order.paid_event_tickets.name` (podsumowanie zamówienia).

Dodać `console.log('[checkout] paypal debug', { ticketRow, paypalLink, hasPaypal, availableMethods })` w `useEffect` po załadowaniu zamówienia, żeby w konsoli było jednoznacznie widać dlaczego opcja się nie pokazuje.

Rozluźnić regex do `https?` (test/dev linki bywają http).

### 2. Drugi tor — fallback z pobieraniem ticketu

Jeśli mimo defensywnego odczytu `ticketRow` nadal jest `null` (np. RLS odrzuca embed dla anonimowego użytkownika w niektórych przypadkach), dograć osobno bilet po `ticket_id`:

```ts
.from('paid_event_tickets').select('name, price_pln, paypal_payment_link').eq('id', order.ticket_id).maybeSingle()
```

i zmergować z `order` w stanie.

### 3. Weryfikacja

Po wdrożeniu otworzyć `/checkout/<id istniejącego zamówienia>` i sprawdzić:
- Konsola pokazuje `hasPaypal: true` i link.
- Karta „PayPal" pojawia się jako opcja na liście metod płatności.
- Po kliknięciu „Kupuję i płacę" otwiera się link PayPal w nowej karcie.

Jeśli logi pokażą `hasPaypal: false` i pusty `ticketRow` → fallback z #2 to rozwiąże.

## Pliki do edycji

- `src/pages/CheckoutPage.tsx` (defensywny odczyt embed'a, dodatkowy fallback fetch ticketu, log diagnostyczny)
