
# Pełna obsługa płatności + bilet PDF z szablonu

## Co już mamy ✅
- **Tabele:** `paid_events` (z flagami `payment_method_payu`, `payment_method_transfer`, `transfer_payment_details`), `paid_event_tickets`, `paid_event_orders`, `paid_event_order_attendees`, `event_form_submissions`
- **Edge functions:** `payu-create-order` (szkielet), `payu-webhook`, `register-event-transfer-order` (działa), `admin-mark-event-payment`, `verify-event-ticket`
- **Admin:** `EventPaymentMethodsPanel` — przełączniki PayU / przelew + dane do przelewu
- **Frontend:** `PurchaseDrawer` z wyborem metody i polami uczestników
- **Storage:** bucket `event-tickets` (gotowy)
- **Email:** SMTP skonfigurowane, szablony rezerwacji przelewu działają

## Czego brakuje ❌
1. **Dedykowana strona checkout** — dziś wszystko w drawer; brak osobnego URL `/checkout/:orderId`
2. **BLIK on-site** — nie ma; trzeba dodać PayU BLIK Authorize (pole na 6-cyfrowy kod)
3. **Secrets PayU** — `PAYU_POS_ID`, `PAYU_CLIENT_ID`, `PAYU_CLIENT_SECRET`, `PAYU_MD5_KEY`, `PAYU_ENV` — brak
4. **Edytor szablonu biletu** — admin nie ma gdzie wgrać blankietu ani ustawić pozycji pól
5. **Generator PDF biletu** — funkcja, która łączy blankiet + dane + QR i zapisuje do storage
6. **QR jako obraz** — dziś tylko tekstowy kod w mailu
7. **Wysyłka biletu PDF** po opłacie (PayU webhook + admin-mark-event-payment)
8. **Strona "Mój bilet"** — `/ticket/:code` z przyciskiem pobrania PDF

---

## Plan implementacji

### KROK 1 — Dane i storage
**Migracja DB:**
- Tabela `event_ticket_templates` (per event):
  `id, event_id (unique), background_url, page_format (A4/A5/ticket-105x148), orientation, fields jsonb` 
  gdzie `fields` = `[{key:'firstName'|'lastName'|'ticketCode'|'qr'|'eventTitle'|'eventDate'|'eventLocation'|'seatNumber', x, y, width, height, fontSize, fontWeight, color, textAlign}]`
- Kolumny w `paid_event_orders`: `ticket_pdf_url text`, `payment_method text` ('payu_card'|'payu_blik'|'payu_transfer'|'manual_transfer'), `payu_blik_authorization_code text`
- Kolumna w `paid_event_order_attendees`: `ticket_pdf_url text`
- Bucket `event-tickets` — dodać politykę publicznego odczytu po podpisanym URL; podfolder `templates/{eventId}/bg.png` i `tickets/{orderId}/{attendeeId}.pdf`

### KROK 2 — Secrets PayU (Twoja akcja)
Po zatwierdzeniu planu poproszę o wpisanie 5 kluczy z panelu PayU (POS_ID, CLIENT_ID, CLIENT_SECRET, MD5_KEY, ENV=sandbox|prod).

### KROK 3 — Strona checkout (`/checkout/:orderId`)
- Nowy `CheckoutPage.tsx` (publiczny, w `PUBLIC_PATHS`)
- 3 sekcje: podsumowanie zamówienia → wybór metody → akcja
- **Karta / Szybki przelew PayU** → przycisk → wywołuje `payu-create-order` → `window.location = redirectUri`
- **BLIK on-site** → input 6 cyfr → wywołuje `payu-blik-charge` (nowa funkcja) → komunikat "potwierdź w aplikacji"
- **Przelew tradycyjny** → wyświetla dane + przycisk "wysłałem przelew" (informacyjnie)
- Po sukcesie redirect na `/ticket/:code`

### KROK 4 — Przebudowa flow zakupu
- `PurchaseDrawer` zostaje, ale po "Kup" tworzy `paid_event_orders` ze statusem `pending` (przez nowy edge `create-event-order` — wspólny dla wszystkich metod) i przekierowuje na `/checkout/:orderId`
- Wybór metody przenosi się z drawer na stronę checkout (drawer już nie wybiera — zbiera tylko dane uczestników)

### KROK 5 — BLIK on-site
- Nowa funkcja `payu-blik-charge`: tworzy order PayU z `payMethod.value = <6-cyfr>`, `type = BLIK_AUTHORIZATION_CODE`
- Polling statusu `payu-check-order` przez 60s; po `COMPLETED` → uruchamia generator biletu

### KROK 6 — Edytor szablonu biletu (admin)
- Nowa zakładka w edytorze eventu: **"Szablon biletu"** (`EventTicketTemplatePanel.tsx`)
- Upload PNG/JPG (max 5MB) → zapis do storage
- Canvas z podgląd blankietu w skali 1:1, drag&drop pól z palety (`Imię`, `Nazwisko`, `Numer biletu`, `QR`, `Data`, `Lokalizacja`, `Tytuł eventu`, `Numer miejsca`)
- Każde pole: pozycja x/y, rozmiar, font, kolor, wyrównanie
- Podgląd "Wygeneruj testowy bilet" → przykładowy PDF

### KROK 7 — Generator PDF biletu
- Nowa funkcja `generate-event-ticket-pdf` (Deno + pdf-lib + qrcode):
  - Pobiera szablon, dane attendee, kod biletu
  - Generuje QR (PNG) z URL `https://purelife.lovable.app/ticket/{code}`
  - Renderuje PDF: tło = blankiet, pola = nakładki tekstu, QR jako obraz
  - Zapisuje do `event-tickets/tickets/{orderId}/{attendeeId}.pdf`
  - Zwraca podpisany URL
- Wywoływana z:
  - `payu-webhook` po `COMPLETED`
  - `payu-blik-charge` po `COMPLETED`
  - `admin-mark-event-payment` po oznaczeniu jako opłacone

### KROK 8 — Wysyłka biletu mailem
- Po wygenerowaniu PDF: email do każdego uczestnika z załącznikiem PDF + przyciskiem "Pobierz bilet" (link do podpisanego URL)
- Edytuje istniejące szablony emaili w 3 funkcjach (PayU webhook, BLIK, admin-mark)

### KROK 9 — Strona biletu publiczna (`/ticket/:code`)
- Wyświetla bilet (preview PDF lub HTML), QR, dane wydarzenia
- Przycisk "Pobierz PDF"
- Status check-in (jeśli już użyty)

### KROK 10 — Walidacja i testy
- Test PayU sandbox (karta + BLIK)
- Test przelewu tradycyjnego (admin oznacza opłacone → bilet się generuje)
- Test edytora szablonu (wgranie, ustawienie pól, podgląd PDF)
- Test QR (skan → otwiera `/ticket/:code`)

---

## Szczegóły techniczne
- **PDF lib:** `pdf-lib` (działa w Deno, obsługuje obrazy PNG/JPG)
- **QR lib:** `npm:qrcode` lub `https://deno.land/x/qrcode` (zwraca PNG bytes)
- **Format jednostek:** PDF używa punktów (1pt = 1/72 cala). Edytor pracuje w pikselach @150 DPI z konwersją przy zapisie
- **Routing:** `/checkout/:orderId` i `/ticket/:code` dodać do `PUBLIC_PATHS` i `KNOWN_APP_ROUTES`
- **Bezpieczeństwo:** dostęp do bucket przez podpisane URL (1h dla checkout, 30 dni dla biletów)

## Estymacja
- Krok 1+2: 1 migracja + secrets (Twoja akcja ~5 min)
- Kroki 3–5: rdzeń checkout + BLIK
- Kroki 6–7: edytor + generator (najwięcej pracy)
- Kroki 8–10: wysyłka, strona biletu, testy

**Po zatwierdzeniu planu zacznę od migracji DB i poproszę o secrets PayU.**
