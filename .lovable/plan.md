## Cel

Po wykryciu, że użytkownik ma już własną rejestrację (`hasOwnTicket === true`):
1. Pola „Dane kupującego" mają zostać trwale zablokowane i puste — nie tylko ukryte, ale też wizualnie zaprezentowane jako zablokowane (na wypadek gdyby przeglądarka próbowała autofillować).
2. Drawer ma pokazać czytelne podsumowanie kosztów: ile gości × cena za bilet = suma, oraz jak zmienia się kwota wraz ze zwiększaniem liczby biletów.

## Zmiany w `src/components/paid-events/public/PurchaseDrawer.tsx`

### 1. Trwałe czyszczenie pól kupującego

- **`useEffect` czyszczący** (już istnieje) — rozszerzyć zależności o `quantity`, `attendees.length` i `open`, żeby przy każdej zmianie ilości / panelu re-asercja czyściła `firstName/lastName/email/phone`. Również w trakcie `transferSuccess === false`.
- **Defensywny guard w `setFormData`** dla pól buyer: stworzyć helper `setBuyerField(key, value)`, który ignoruje set gdy `hasOwnTicket`. (Aktualne onChange'e są już ukryte — pozostaje to zabezpieczenie na wypadek refaktoru / przyszłych zmian.)
- **`buildPayload()`** — już używa `profile` zamiast `formData` w trybie `hasOwnTicket`. Dodatkowo zatrzymać submit z bezpiecznikiem: jeżeli `hasOwnTicket` a `formData.firstName/lastName/email` jest niepuste → wymusić clear przed wysłaniem (assert + ponowny `setFormData`).

### 2. Wizualny „lock" zamiast pustki

Tam, gdzie obecnie sekcja „Dane kupującego" jest po prostu ukrywana, dodać krótki, niepełny placeholder z ikoną kłódki i napisem:
- Tytuł: „Twoje dane są już zapisane"
- Podtytuł: „Powiązaliśmy zamówienie z Twoim kontem (`<email z profilu>`). Pola kupującego są zablokowane."
- Prezentacja: dyskretny `bg-muted/30` box z `Lock` icon (lucide-react), bez żadnych inputów.

### 3. Rozszerzone podsumowanie kosztów

W bloku „Order Summary" (obecnie linie ~313–365), pod selektorem ilości i przed total-em, zawsze pokazywać szczegółowy breakdown:
- Linia: `Liczba uczestników: {totalSeats}` (jeśli `seatsPerTicket > 1` lub `quantity > 1`).
- Linia: `Cena za bilet: {formatPrice(price)}`.
- Linia: `Bilety: {quantity} × {formatPrice(price)} = {formatPrice(totalPrice)}` (zawsze gdy `quantity ≥ 1`, nie tylko `> 1`).
- W trybie `hasOwnTicket`: zamiast „Bilety" napisać `Bilety dla gości: {quantity} × {formatPrice(price)} = {formatPrice(totalPrice)}`, plus mała linia hint: `Im więcej gości zaprosisz, tym wyższa kwota — kalkulacja aktualizuje się automatycznie.`
- Zachować dotychczasowy total „Do zapłaty" jako pogrubiony wiersz na końcu (bez zmian).

### 4. Bez zmian

- Edge functions, RLS, schemat bazy.
- Tryb anonimowy (niezalogowany) — `hasOwnTicket` wymaga `user?.id`.
- `MyEventTicketsInline.tsx`.

## Uwagi techniczne

Dodać import `Lock` z `lucide-react` razem z istniejącymi ikonami w linii 7.