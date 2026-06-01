
## Cel

Jedno wydarzenie, dwa równolegle widoczne bilety:
- **Bilet płatny przelewem** — widoczny dla **zalogowanych** (logują się, klikają „Kup", dostają email z danymi do przelewu, admin oznacza opłacone → bilet QR).
- **Bilet bezpłatny** — widoczny dla **gościa wchodzącego przez link od zapraszającego** (`/e/:slug?ref=...`), wypełnia formularz, dostaje email potwierdzający, klika CTA → email z biletem QR.

Każdy z nich może mieć dowolną metodę: `payu | transfer | paypal | free`. Decyzja jest **na bilecie**, nie na wydarzeniu.

Żadna zmiana nie może popsuć:
- czysto darmowych wydarzeń (event-level `is_free = true`),
- czysto płatnych (transfer/PayU/PayPal jak dziś),
- istniejących formularzy rejestracyjnych, biletów QR, emaili, statystyk.

## Analiza obecnego stanu

Dziś podział free vs paid jest **na wydarzeniu** (`paid_events.is_free`), a metoda płatności wspólna dla całego wydarzenia (`payment_method_payu/_transfer/_paypal`). Nie ma żadnego mechanizmu „ten bilet dla zalogowanych, tamten dla gości".

Bilet (`paid_event_tickets`) ma cenę i limity, ale brak: (a) własnej metody płatności, (b) widoczności wg audytorium.

## Rozwiązanie — dwie kolumny na bilecie

### 1. Migracja DB (jedna)

`paid_event_tickets` dodajemy:

- `payment_method text not null default 'inherit'` — wartości `'inherit' | 'payu' | 'transfer' | 'paypal' | 'free'`.
  - `'inherit'` = używaj metod z eventu (zachowanie wsteczne).
- `audience text not null default 'all'` — wartości `'all' | 'logged_in' | 'guest_only'`.

Backfill: wszystkie istniejące bilety dostają `payment_method = 'inherit'`, `audience = 'all'` → zero zmian w działającym systemie.

(Bez CHECK constraints — walidacja w UI + edge functions, zgodnie z polityką projektu.)

### 2. Admin — `EventTicketsPanel`

Przy każdym bilecie dwa nowe pola:

- **Metoda płatności biletu**: select `Dziedzicz z wydarzenia (domyślnie) | Płatność online (PayU) | Przelew | PayPal | Bezpłatny`.
  - Gdy wybrane `Bezpłatny` → pole ceny ukryte / zapisywane jako 0; info „ten bilet pomija metody wydarzenia, gość dostaje formularz rezerwacji + email potwierdzający".
- **Widoczność biletu**: select `Wszyscy | Tylko zalogowani | Tylko goście z linkiem zapraszającego`.
  - Info: „Tylko zalogowani" — bilet ukryty dla niezalogowanych odwiedzających. „Tylko goście z linkiem" — bilet pokazywany wyłącznie, gdy URL zawiera `?ref=...` (link zapraszającego).

`EventPaymentMethodsPanel` zostaje, ale dostaje notkę: „Te ustawienia działają dla biletów z metodą **Dziedzicz**. Bilety z własną metodą ignorują te przełączniki."

### 3. Publiczna strona — `PaidEventPage` + `PurchaseDrawer`

`PaidEventPage`:
- Filtruje listę biletów per audytorium:
  - `audience = 'all'` → zawsze pokazywany,
  - `audience = 'logged_in'` → tylko gdy `user` zalogowany,
  - `audience = 'guest_only'` → tylko gdy w URL jest `ref` (i opcjonalnie tylko dla niezalogowanych — do potwierdzenia w UI, ale logicznie zapraszający ściąga gościa).
- Wylicza efektywną metodę biletu: `ticket.payment_method === 'inherit' ? eventMethods : ticket.payment_method`.
- Przekazuje do `PurchaseDrawer` propsy per bilet: `isFree`, `paymentMethodPayu`, `paymentMethodTransfer`, `paymentMethodPaypal` — wyliczone z efektywnej metody danego biletu (nie z eventu).

`PurchaseDrawer`:
- Praktycznie bez zmian wewnętrznych — już operuje na propsach `isFree` i `paymentMethod*`. Wystarczy że dostanie wartości pochodzące z biletu, nie z eventu.
- Gałąź `isFree=true` woła `register-free-event-order` → flow z potwierdzeniem email + bilet QR (już zaimplementowany).
- Gałąź `isFree=false` woła `create-event-order` → przekierowanie na `/checkout/{orderId}` → wybór metody (jednej narzuconej przez bilet) → email z danymi do przelewu (już zaimplementowany).

### 4. Strona checkoutu `/checkout/{orderId}`

Już dziś prezentuje metody włączone na wydarzeniu. Zmiana: jeśli `order.ticket` ma `payment_method ≠ 'inherit'`, wymuszamy dokładnie tę metodę (ukrywamy alternatywy). Dla `'inherit'` — zachowanie jak dziś.

### 5. Edge Functions — minimalne i tylko zabezpieczające

- `register-free-event-order`: dodać walidację, że `ticket.payment_method = 'free'` **lub** event ma `is_free = true`. Inaczej zwróć `ticket_not_free`.
- `create-event-order`: dodać walidację, że `ticket.payment_method ≠ 'free'`. Inaczej zwróć błąd „Ten bilet jest bezpłatny — użyj rezerwacji".
- `payu-create-order`, `admin-mark-event-payment`, `confirm-event-form-email`, `free-event-ticket.ts` — **bez zmian**. Wszystkie istniejące flow działają identycznie.

### 6. Linki gościa (`/e/:slug?ref=...`)

Bez zmian funkcjonalnych — slug page już dziś przekazuje `ref` do `/events/register/...` i `PaidEventPage`. Wystarczy, że bilet `audience = 'guest_only'` zostanie wyświetlony, gdy `ref` jest w URL. Logowany użytkownik wchodząc bez `ref` go nie zobaczy → kupi bilet płatny dla zalogowanych. Gość wchodzący przez link od partnera widzi bilet bezpłatny i rejestruje się formularzem.

### 7. Statystyki / liczniki

`tickets_sold` + `activeSubmissionsCount` w `PaidEventPage` już agregują oba źródła (orders + submissions) — bez zmian. Dedup w `EventFormsList` (wcześniejszy fix) działa dalej, bo nie zależy od metody/audytorium.

## Co dokładnie się nie zmieni

- Istniejące wydarzenia: wszystkie bilety dostają `payment_method='inherit'`, `audience='all'` → zachowanie 1:1 jak teraz.
- Maile, szablony biletów, QR, CRM, partner linki, statystyki — bez zmian.
- Event-level `is_free` zostaje (legacy, dalej działa dla czysto-darmowych wydarzeń).

## Pliki do edycji

```text
supabase/migrations/<new>.sql                                          (+ payment_method, audience na paid_event_tickets + backfill)
src/components/admin/paid-events/editor/EventTicketsPanel.tsx          (2 nowe selecty per bilet + walidacje UI)
src/components/admin/paid-events/editor/EventPaymentMethodsPanel.tsx   (notka informacyjna)
src/pages/PaidEventPage.tsx                                            (filtr per audytorium + wyliczanie metody per bilet → propsy do drawera)
src/components/paid-events/public/PurchaseDrawer.tsx                   (drobny refactor: brać metody/isFree z biletu zamiast z eventu)
src/pages/CheckoutPage.tsx (jeśli istnieje pod tą nazwą)               (wymuszenie metody, gdy bilet ją narzuca)
supabase/functions/register-free-event-order/index.ts                  (walidacja ticket.payment_method === 'free')
supabase/functions/create-event-order/index.ts                         (walidacja ticket.payment_method !== 'free')
```

## Scenariusz końcowy admina

W wydarzeniu „Konferencja X" admin tworzy 2 bilety:

1. **„Bilet VIP — 250 zł"** — metoda: `Przelew`, widoczność: `Tylko zalogowani`.
2. **„Wejście dla gościa — bezpłatne"** — metoda: `Bezpłatny`, widoczność: `Tylko goście z linkiem zapraszającego`.

Efekt:
- Zalogowany użytkownik na stronie wydarzenia widzi tylko VIP-a → checkout → przelew → email z numerem konta → admin oznacza opłacone → bilet QR.
- Gość klikający w link `/e/konferencja-x?ref=ABC123` od partnera widzi tylko bilet bezpłatny → formularz → email potwierdzający → klik CTA → email z biletem QR.

Dwie różne grupy, dwa różne flow, jedno wydarzenie, bez naruszania istniejącego systemu.
