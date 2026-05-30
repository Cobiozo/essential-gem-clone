Cel: jeśli PayU nie jest "aktywne" (czyli `payu_settings.is_enabled = false` lub `last_test_ok ≠ true`), użytkownik nie może wybrać PayU/BLIK jako formy płatności — przycisk „Kupuję i płacę” pozostaje nieaktywny z czytelnym komunikatem, a w drawerze zakupu opcja PayU jest również zablokowana.

## Zmiany

### 1. Nowy hook `usePayUStatus`
- Plik: `src/hooks/usePayUStatus.ts`
- Czyta z `payu_settings` (singleton) pola `is_enabled`, `last_test_ok`, `last_test_at`, `last_test_message`.
- Zwraca:
  - `payuReady: boolean` — `is_enabled === true && last_test_ok === true`
  - `reason: string | null` — np. „PayU nie jest włączone", „Ostatni test połączenia nie powiódł się", „Brak testu połączenia"
  - `loading: boolean`
- Cache przez `react-query`, krótki staleTime (30 s), bez auto-refetch.

### 2. `CheckoutPage.tsx` (wewnętrzny ekran wyboru metody)
- Użyć `usePayUStatus`.
- Jeśli `!payuReady`:
  - Opcje `payu` i `blik` w `RadioGroup` renderowane jako wyszarzone (opacity-50, cursor-not-allowed, `RadioGroupItem disabled`), z małym komunikatem pod nazwą: „Tymczasowo niedostępne — {reason}".
  - Domyślny wybór metody przełączyć na pierwszą dostępną metodę inną niż PayU/BLIK (np. transfer); jeśli brak takiej, żadnej.
- Przycisk „Kupuję i płacę": dodać do `disabled` warunek `(method === 'payu' || method === 'blik') && !payuReady`.
- Gdy PayU/BLIK jest wybrane i niedostępne, pod przyciskiem wyświetlić mały alert: „PayU jest tymczasowo niedostępne. Wybierz inną metodę płatności.".

### 3. `PurchaseDrawer.tsx` (drawer „Przejdź do płatności")
- Użyć `usePayUStatus`.
- Wyliczyć `effectivePayu = paymentMethodPayu && payuReady`.
- Jeśli skonfigurowane są obie metody (PayU + przelew) i PayU jest niedostępne — `paymentMethodPayu` traktować jako wyłączone (czyli flow przejdzie bezpośrednio do `/checkout/:orderId`, gdzie zostanie tylko przelew).
- Jeśli wydarzenie ma tylko PayU i `!payuReady`:
  - Przycisk „Przejdź do płatności" → `disabled`, tooltip/komunikat pod nim: „PayU jest tymczasowo niedostępne. Spróbuj ponownie później.".
- Jeśli `paymentMethodTransfer` jest dostępne — przycisk pozostaje aktywny, flow leci przez `/checkout/:orderId` (przelew).

### 4. Brak zmian backendu / DB
- Tabela `payu_settings` i edge function `payu-test-connection` już zapisują `last_test_ok`. Nie ruszamy.

## Szczegóły techniczne

- `payu_settings` ma RLS — sprawdzę szybko, czy `anon`/`authenticated` mogą czytać `is_enabled`/`last_test_ok`. Jeśli polityka pozwala tylko adminom, dodam dedykowany SELECT policy dla `authenticated` na te cztery kolumny przez widok publiczny (`payu_status_public` view) lub `SECURITY DEFINER` RPC `get_payu_public_status()`. Migracja tylko w razie potrzeby.
- W obu komponentach dodać `aria-disabled` i `title` z powodem, żeby wsparcie dostępności było zachowane.