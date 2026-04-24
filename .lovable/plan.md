## Problemy do naprawy

### 1. Cena wyświetlana błędnie ("3500 zł" zamiast "35,00 zł")

W bazie danych ceny biletów (`paid_event_tickets.price_pln`) są przechowywane w **groszach** — admin wpisuje 35 PLN, a kod zapisuje `3500` (× 100). Edytor admina (`EventTicketsPanel.tsx`) prawidłowo dzieli przez 100 przy wyświetlaniu, ale strona publiczna wydarzenia (`PaidEventPage.tsx` linia 126) przekazuje surową wartość w groszach do sidebaru jako `price`, więc na karcie pojawia się "3500 zł".

**Naprawa:** w `src/pages/PaidEventPage.tsx` zamienić `price: Number(ticket.price_pln) || 0` na `price: (Number(ticket.price_pln) || 0) / 100`. Dzięki temu sidebar (`PaidEventSidebar.tsx`), `PurchaseDrawer.tsx` oraz każdy inny konsument pola `price` pokażą poprawną kwotę 35,00 zł brutto. Dodatkowo upewnić się, że `formatPrice` w `PaidEventSidebar.tsx` używa `minimumFractionDigits: 2` (a nie 0), żeby zawsze pokazywać dwie miejsca po przecinku w stylu polskim ("35,00 zł").

### 2. Auto-zaciąganie danych partnera po kliknięciu "Zapisz się"

Obecnie:
- Gdy zalogowany partner klika "Zapisz się" na stronie wydarzenia z biletami, otwiera się `PurchaseDrawer` z **pustym** formularzem (imię/nazwisko/email/telefon).
- Auto-fill istnieje tylko w publicznym formularzu rejestracji (`EventFormPublicPage.tsx`), do którego prowadzi inna ścieżka (gdy nie ma biletów).

**Naprawa w `src/components/paid-events/public/PurchaseDrawer.tsx`:**
- Dodać `useAuth()` i `useEffect`, który przy otwarciu drawera (`open === true`) prepełnia `formData.firstName`, `lastName`, `email`, `phone` z `profile` (`first_name`, `last_name`, `email`/`user.email`, `phone_number`) — analogicznie do logiki z `EventFormPublicPage.tsx` linie 73–80.
- Zachować zasadę "nie nadpisuj jeśli użytkownik już coś wpisał" (prefer existing value).

### Pliki do zmiany
- `src/pages/PaidEventPage.tsx` — dzielenie ceny przez 100.
- `src/components/paid-events/public/PaidEventSidebar.tsx` — `minimumFractionDigits: 2` w `formatPrice`.
- `src/components/paid-events/public/PurchaseDrawer.tsx` — auto-fill z profilu zalogowanego użytkownika oraz `minimumFractionDigits: 2` w `formatPrice`.

### Bez zmian w bazie
Nie modyfikujemy schematu — konwencja "ceny w groszach" pozostaje (zgodna z edytorem admina i przyszłą integracją PayU, która wymaga kwot w najmniejszej jednostce).
