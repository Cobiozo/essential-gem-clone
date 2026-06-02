## Problem

W `PurchaseDrawer` dla biletu płatnego, niezależnie od metody płatności, klikamy „Przejdź do płatności" → wywoływana jest `create-event-order` i przekierowanie na `/checkout/{orderId}`. Gdy bilet wymusza wyłącznie **płatność przelewem**, to:
1. Etykieta przycisku jest myląca („Przejdź do płatności" zamiast „Rezerwuję").
2. Nie wysyłany jest e-mail z danymi do przelewu (bo `register-event-transfer-order` nie jest wywoływane).
3. `/checkout/{orderId}` pokazuje błąd „Nie znaleziono zamówienia" / mylący ekran PayU dla zamówienia, które powinno być rezerwacją przelewową.

`register-event-transfer-order` już istnieje, wspiera per‑ticket `transfer_payment_details` i wysyła profesjonalny e-mail z danymi do przelewu (dla zalogowanego również).

## Zakres zmian (tylko frontend `PurchaseDrawer.tsx`)

### 1. Wykryj „tryb przelew"
Wyliczyć flagę:
```text
transferOnly = !isFree && paymentMethodTransfer && !paymentMethodPayu && !paymentMethodPaypal
```
(czyli jedyną dostępną metodą płatności jest przelew — co odpowiada konfiguracji „bilet wymusza transfer" przekazanej z `PaidEventPage`).

### 2. Etykieta przycisku
W bloku CTA w `DrawerFooter`:
- `isFree` → `Zarezerwuj miejsce` (bez zmian)
- `transferOnly` → **`Rezerwuję`** (ikona `Banknote`)
- pozostałe → `Przejdź do płatności` (bez zmian)

### 3. Routing zapisu w `handleSubmit`
Dodać gałąź przed obecnym wywołaniem `create-event-order`:
```text
if (transferOnly) {
  invoke('register-event-transfer-order', { body: payload })
  // map errors (transfer_disabled, transfer_details_missing, ticket_not_found,
  //   missing_fields, already_registered) → polskie komunikaty
  // ustaw setTransferSuccess(true) — istniejący ekran sukcesu pokazuje
  //   „Wysłaliśmy email z danymi do przelewu na …"
  // invalidate queries: my-ticket-orders, my-event-tickets-inline,
  //   my-event-ticket-exists, my-event-registration-fallback
  return
}
```
Nie ruszamy gałęzi `isFree` ani standardowej PayU.

### 4. Info-box „Płatność przelewem"
Bez zmian — komunikat „po rejestracji wyślemy Ci email z danymi do przelewu" już istnieje (linie 631–635) i pasuje do nowego flow.

## Walidacja po implementacji
- Zalogowany partner → bilet `Kompleksowe szkolenie test` (transfer) → klika **Rezerwuję** → widzi ekran „Dziękujemy za rejestrację" + ekran z informacją, że e-mail z danymi do przelewu został wysłany. Brak przekierowania na `/checkout/...`.
- Sprawdzić w `email_send_log` / skrzynce, że e-mail z `register-event-transfer-order` dotarł na adres profilu zalogowanego, zawiera per‑ticket `transfer_payment_details` (z fallback na event-level).
- Gość z darmowym biletem → bez zmian (osobny flow `register-free-event-order` + e-mail potwierdzający → po kliknięciu w link otrzymuje bilet QR).

## Pliki do edycji
- `src/components/paid-events/public/PurchaseDrawer.tsx` (jedyna zmiana logiczna; brak migracji, brak zmian w edge functions).