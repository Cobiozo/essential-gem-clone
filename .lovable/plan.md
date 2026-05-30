
# Pełna obsługa płatności + bilet PDF — z konfiguracją PayU w panelu admina

## Zmiana vs poprzedni plan
PayU credentials **nie** trafiają do Lovable Secrets — admin wpisuje je w panelu (`/admin/payments`). Edge functions czytają je z bazy zamiast z `Deno.env`.

## Co już mamy ✅
- Migracja DB wykonana: `event_ticket_templates`, kolumny `payment_method`/`payu_blik_auth_code`/`ticket_pdf_url`
- Bucket `event-tickets`
- Funkcje: `payu-create-order`, `payu-webhook`, `register-event-transfer-order`, `admin-mark-event-payment`, `verify-event-ticket`
- `EventPaymentMethodsPanel` (przełączniki per event)
- `PurchaseDrawer` (zbiera dane uczestników)

## Plan implementacji

### KROK A — Tabela ustawień PayU + panel admina
- Migracja: tabela `payu_settings` (1 wiersz):
  `pos_id, client_id, client_secret, md5_key, second_md5_key, environment ('sandbox'|'production'), is_enabled`
- RLS: tylko admin SELECT/UPDATE; service_role pełny dostęp dla edge functions
- Nowa strona admina `/admin/payments` (`PaymentsAdminPage.tsx`):
  - Formularz z 6 polami (klient/sekret jako password z toggle "pokaż")
  - Przycisk **"Testuj połączenie"** → wywołuje `payu-test-connection` (pobiera OAuth token z PayU)
  - Status karty: ✅ skonfigurowane / ⚠️ brak danych
- Link do strony dodać w `AdminPanel` przy istniejących sekcjach płatności
- Nowy `_shared/payu-config.ts` w edge functions — funkcja `getPayUConfig()` czytająca z bazy

### KROK B — Polityki storage dla biletów
- Migracja storage: bucket `event-tickets` już istnieje; dodaję polityki:
  - SELECT (anon + authenticated) — bilety i tła publiczne (chronione obscure path)
  - INSERT/UPDATE/DELETE — tylko admin (templates) i service_role (tickets)

### KROK C — Refaktor `payu-create-order` + nowa `payu-blik-charge`
- `payu-create-order`: czyta config z bazy (zamiast env), zwraca jasny błąd jeśli brak konfiguracji
- Nowa `payu-blik-charge`: tworzy order z `payMethod.type='PBL', value='blik-token'` z kodem 6-cyfrowym
- Nowa `payu-check-order`: GET `/api/v2_1/orders/{orderId}` — używana do pollingu po BLIK
- `payu-webhook`: bez zmian + woła `generate-event-ticket-pdf` po COMPLETED

### KROK D — Strona checkout (`/checkout/:orderId`)
- Nowy `CheckoutPage.tsx` (publiczny, dodać do `PUBLIC_PATHS` + `KNOWN_APP_ROUTES`)
- Pobiera order z bazy (po orderId — sygnatura tokenowa nie potrzebna, bo orderId jest losowy UUID)
- 3 kafle metod płatności (tylko te włączone w evencie):
  1. **PayU (karta/szybki przelew)** — przycisk → redirect na payu.com
  2. **BLIK** — pole 6 cyfr + przycisk → polling statusu z toastem postępu
  3. **Przelew tradycyjny** — wyświetla dane do przelewu + info "wyślemy bilet po zaksięgowaniu"
- Po sukcesie → redirect na `/ticket/:code`

### KROK E — Refaktor flow zakupu
- `PurchaseDrawer` po kliknięciu "Kup" tworzy order ze statusem `pending` (nowy edge `create-event-order` — wspólny endpoint) i przekierowuje na `/checkout/:orderId`
- Drawer już **nie wybiera** metody — tylko zbiera dane buyer + attendees
- `register-event-transfer-order` przerabiam na bardziej ogólny `create-event-order` z parametrem `payment_method_preference` (do oznaczenia, ale finalny wybór i tak na checkout)

### KROK F — Edytor szablonu biletu (`/admin/events/:id/ticket-template`)
- Nowa zakładka w edytorze eventu: **"Szablon biletu"** (`EventTicketTemplatePanel.tsx`)
- Upload PNG/JPG do `event-tickets/templates/{eventId}/bg.{ext}` (max 5MB, crop opcjonalny)
- Canvas z podglądem blankietu w skali (responsive zoom)
- Paleta pól do drag&drop: `firstName`, `lastName`, `ticketCode`, `qr`, `eventTitle`, `eventDate`, `eventLocation`, `seatNumber`, `ticketName`
- Per pole: pozycja x/y (px), rozmiar w/h (px), fontSize, fontWeight (normal/bold), color (hex), textAlign (left/center/right)
- Format strony: A4 / A5 / custom (US Letter, bilet 105×148)
- Przycisk **"Wygeneruj testowy bilet"** → woła `generate-event-ticket-pdf` z mock-data i otwiera PDF w nowej karcie
- Zapis do `event_ticket_templates` (upsert per event)

### KROK G — Generator PDF biletu (`generate-event-ticket-pdf`)
- Deno + `npm:pdf-lib` + `npm:qrcode`
- Input: `{ orderId, attendeeId? }` (gdy brak attendeeId → bilet dla buyera lub wszystkie)
- Algorytm:
  1. Pobierz template (jeśli brak → użyj domyślnego białego A5 z polami w stałych pozycjach)
  2. Pobierz attendee + event + order
  3. Wygeneruj QR PNG (URL `https://purelife.lovable.app/ticket/{code}`)
  4. Wczytaj background image (jeśli ustawiony)
  5. Stwórz PDF strony w rozmiarze odpowiadającym formatowi
  6. Embed background, render każde pole w odpowiedniej pozycji (konwersja px@150DPI → pt)
  7. Render QR jako embedded PNG
  8. Upload do `event-tickets/tickets/{orderId}/{attendeeId}.pdf`
  9. UPDATE `paid_event_order_attendees.ticket_pdf_url`
  10. Zwróć URL
- Wywoływana z: `payu-webhook`, `payu-blik-charge`, `admin-mark-event-payment`

### KROK H — Email z biletem
- Nowa funkcja `send-event-ticket-email` (lub edycja w 3 miejscach):
  - Iteruje po attendees, pobiera/generuje PDF każdego
  - Wysyła email per uczestnik (jeśli ma email) z załącznikiem PDF + linkiem "Pobierz / Mój bilet"
  - Buyer dostaje email zbiorczy z linkami do wszystkich biletów
- Edycja istniejących emaili w `payu-webhook` i `admin-mark-event-payment` → wołają `send-event-ticket-email`

### KROK I — Strona biletu publiczna (`/ticket/:code`)
- Publiczna (dodać do `PUBLIC_PATHS`)
- Wyświetla:
  - Iframe/preview PDF biletu (lub HTML render z QR jako fallback)
  - Dane wydarzenia + uczestnika
  - Status: ✅ ważny / ⏳ oczekuje na płatność / ✓ użyty (checked-in)
  - Przycisk "Pobierz PDF"

### KROK J — Walidacja i testy
- Test panelu PayU: wpisanie danych → testuj połączenie → ✓
- Test sandbox PayU karta + BLIK
- Test przelewu: admin oznacza opłacone → generuje się PDF → email dochodzi
- Test edytora: upload tła + ustawienie 4 pól + testowy bilet
- Skan QR z PDF → otwiera `/ticket/:code`

---

## Szczegóły techniczne
- **PDF lib:** `pdf-lib` (Deno-compatible przez npm:)
- **QR:** `npm:qrcode` (zwraca PNG buffer)
- **Konfiguracja PayU w bazie:** tabela 1-wierszowa z RLS admin-only, edge functions czytają przez service_role
- **Bezpieczeństwo client_secret/md5_key:** RLS blokuje odczyt z anon, frontend admina dostaje zamaskowane wartości (`****`) i POST aktualizuje tylko jeśli wpisano nową wartość

## Co Ty robisz, a co ja
**Ja (po zatwierdzeniu):** migracja `payu_settings`, polityki storage, wszystkie edge functions, wszystkie strony i panele
**Ty:** wchodzisz na `/admin/payments` po wdrożeniu, wpisujesz dane PayU z panelu PayU.pl, klikasz "Testuj" → gotowe

**Zatwierdź żeby zaczął implementację.**
