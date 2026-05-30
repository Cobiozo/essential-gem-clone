## Cel

Po kliknięciu „Przejdź do płatności" klient ZAWSZE trafia do okna wyboru formy płatności (`/checkout/:orderId`). Jeżeli PayU nie jest skonfigurowane/aktywne:
- żadna opcja płatności nie jest zaznaczalna (wszystkie radio disabled),
- przycisk „Kupuję i płacę" jest disabled,
- widoczny komunikat z powodem (`reason` z `usePayUStatus`).

## Zmiany

### 1. `src/components/paid-events/public/PurchaseDrawer.tsx`
Cofnąć poprzednią logikę blokującą redirect:
- usunąć `effectivePayu`, `payuBlocked`, warunkowe disable przycisku „Przejdź do płatności" oraz komunikaty o niedostępności PayU w stopce drawera.
- `handleSubmit` znów używa `paymentMethodPayu` tylko do decyzji „czy w ogóle pokazywać checkout vs bezpośredni flow przelewu". Jeśli `paymentMethodPayu === true` (admin skonfigurował metodę w evencie) → zawsze redirect do `/checkout/:orderId`, niezależnie od `payuReady`.
- Hook `usePayUStatus` zostaje usunięty z tego pliku (nieużywany).

### 2. `src/pages/CheckoutPage.tsx`
Rozszerzyć obecne disable PayU/BLIK na WSZYSTKIE metody, gdy `!payuReady`:
- Każdy `RadioGroupItem` (PayU, BLIK, transfer, ewentualne inne) otrzymuje `disabled={!payuReady}` + `opacity-50 cursor-not-allowed`.
- `RadioGroup` jako całość: `disabled={!payuReady}`.
- Przycisk „Kupuję i płacę": `disabled` gdy `!payuReady` (oprócz dotychczasowych warunków — submitting, brak metody, brak zgód).
- Alert na górze formularza z `reason` z `usePayUStatus`, np. „Płatności są tymczasowo niedostępne: {reason}. Spróbuj ponownie później.".
- Domyślny `method` pozostaje pierwszą dostępną metodą (bez specjalnego fallbacku — i tak nic nie można kliknąć).

### 3. Bez zmian
- Hook `usePayUStatus` i RPC `get_payu_public_status` — bez zmian.
- Brak migracji.

## Efekt
- Drawer: „Przejdź do płatności" zawsze aktywny dla wariantu PayU → redirect do `/checkout/:orderId`.
- Checkout przy `!payuReady`: pełna blokada UI + komunikat, tak jak prosi użytkownik.
