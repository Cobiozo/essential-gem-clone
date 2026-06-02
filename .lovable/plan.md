## Kontynuacja: bilety z metodą płatności + pozycja "Cena" zawsze widoczna

Poprzednie zmiany (per-ticket `payment_method` + `audience`) są wdrożone. Teraz domykam dwie rzeczy:

### 1. Pole "Cena" zawsze widoczne na bilecie (admin + front)

**Admin (`EventTicketsPanel.tsx`)**
- Pole `price_pln` (Cena) ma być ZAWSZE widoczne i edytowalne, niezależnie od wybranej metody płatności (również dla `payment_method='free'`).
- Usuwam auto-zerowanie ceny przy wyborze "Bezpłatny" — admin może wpisać dowolną wartość (np. wartość referencyjna biletu), ale to metoda płatności decyduje o tym, czy bilet jest faktycznie płatny.
- Jeżeli pole jest puste → traktujemy jako `0` (zapis do bazy = 0 grosze).
- Placeholder: `0,00`. Wyświetlana wartość pod inputem: `0,00 zł` gdy puste / 0.

**Front publiczny (`PaidEventSidebar.tsx`)**
- Zamiast etykiety "Bezpłatny" pokazujemy ZAWSZE sformatowaną cenę.
- Gdy cena = 0 → wyświetla się `0,00 zł` (a nie ukryte / "Bezpłatny").
- Funkcja `formatPrice` już zwraca `0,00 zł` dla zera — wystarczy usunąć branch `isFree ? 'Bezpłatny' : formatPrice(...)`.
- Pasek "brutto (z VAT)" zostaje tylko dla biletów z ceną > 0 (dla 0,00 zł nie ma sensu).

**Podgląd admina (`EventEditorPreview.tsx`)**
- Już używa `formatPrice` → zwróci `0,00 zł` dla zera, bez zmian logicznych.

### 2. Logika "co znaczy darmowy" pozostaje przy `payment_method`

- Cena to czysta wartość liczbowa (informacyjna / do faktury / do statystyk).
- O ścieżce zakupu decyduje WYŁĄCZNIE `payment_method`:
  - `free` → `register-free-event-order` (rejestracja + email z biletem, bez płatności)
  - `transfer` / `payu` / `paypal` / `inherit` → `create-event-order` → checkout
- To oznacza, że bilet może mieć `payment_method='free'` i jednocześnie cenę np. `199,00 zł` wyświetlaną informacyjnie (np. "wartość biletu 199 zł — dla Ciebie 0 zł"). Domyślnie jednak admin wpisze 0.

### 3. Brak zmian w bazie i edge functions

- Schemat `paid_event_tickets` bez zmian — `price_pln integer NOT NULL DEFAULT 0` już istnieje.
- Edge functions `register-free-event-order` i `create-event-order` bez zmian (walidacja dalej oparta o `payment_method`).
- Brak ryzyka dla istniejących wydarzeń.

### Pliki do edycji

- `src/components/admin/paid-events/editor/EventTicketsPanel.tsx` — odblokować pole ceny dla `free`, usunąć auto-zero, dodać placeholder `0,00`.
- `src/components/paid-events/public/PaidEventSidebar.tsx` — zawsze pokazuj sformatowaną cenę (również `0,00 zł`).
- (opcjonalnie) `src/pages/CheckoutPage.tsx` — drobny check, żeby cena 0 z metodą inną niż `free` była traktowana jak rejestracja darmowa (bezpiecznik); do potwierdzenia czy potrzebne.

### Pytanie kontrolne

Czy bilet z `payment_method='free'` ma móc mieć **wyświetlaną cenę > 0** (np. „wartość 199 zł, dla Ciebie 0 zł"), czy raczej dla `free` cena ma być wymuszona na 0? Domyślnie zakładam pierwsze (większa elastyczność), ale to jedna linijka różnicy.