## Cel

Na poziomie pojedynczego płatnego wydarzenia dodać trzeci przełącznik metody płatności **PayPal** (obok PayU i przelewu). Jedna z włączonych metod = jedyna dostępna w checkout. Jeśli bilet ma dodatkowo `paypal_payment_link`, to przy wyborze PayPal kupujący trafia bezpośrednio pod ten link (już zaimplementowane w `CheckoutPage`).

## Zmiany

### 1. Migracja bazy
Dodać do `paid_events` kolumnę:
```sql
ALTER TABLE public.paid_events
  ADD COLUMN payment_method_paypal boolean NOT NULL DEFAULT false;
```

### 2. `src/components/admin/paid-events/editor/EventPaymentMethodsPanel.tsx`
- Dodać `payment_method_paypal: boolean` do `PaymentConfig` i do `select(...)`.
- Dodać trzeci kafelek z `Switch` „Płatność przez PayPal" + krótki opis: „Bilet zawiera bezpośredni link PayPal (ustawiany na poziomie biletu). Potwierdzenie wpłaty ręczne przez organizatora."
- Update walidacji: wymagana ≥1 z trzech metod (`payu || transfer || paypal`).
- `isDirty` uwzględnia nowe pole.
- Mutacja zapisu i query invalidation bez zmian.

### 3. `src/pages/PaidEventPage.tsx`
- Przekazać `paymentMethodPaypal={(event as any).payment_method_paypal ?? false}` do `PurchaseDrawer`.

### 4. `src/components/paid-events/public/PurchaseDrawer.tsx`
- Dodać prop `paymentMethodPaypal?: boolean` (default `false`).
- `noMethods = !paymentMethodPayu && !paymentMethodTransfer && !paymentMethodPaypal`.

### 5. `src/pages/CheckoutPage.tsx`
- W `select(...)` dodać `payment_method_paypal` z `paid_events`.
- W `OrderInfo.paid_events` dodać `payment_method_paypal: boolean`.
- `availableMethods`: `paypal` dodawane **tylko** gdy `order.paid_events.payment_method_paypal === true` (a nie samo `hasPaypal`).
- Gdy `payment_method_paypal === true` ale brak `paypalLink` w bilecie → pokazać kafelek PayPal z komunikatem „Skontaktuj się z organizatorem — link PayPal nie jest dostępny", przycisk `disabled`. (Albo: PayPal opcja widoczna tylko gdy jest link — proszę o decyzję; domyślnie zakładam wariant z linkiem.)

Decyzja domyślna: **PayPal w checkout aktywny tylko gdy `payment_method_paypal=true` AND bilet ma `paypal_payment_link`**. To zgodne z prośbą: „jeżeli jest dodany do biletu link do paypal to wtedy działa bezpośrednio".

## Pliki

- `supabase/migrations/<timestamp>_add_paypal_payment_method.sql`
- `src/components/admin/paid-events/editor/EventPaymentMethodsPanel.tsx`
- `src/pages/PaidEventPage.tsx`
- `src/components/paid-events/public/PurchaseDrawer.tsx`
- `src/pages/CheckoutPage.tsx`

Po migracji `types.ts` zaktualizuje się automatycznie.
