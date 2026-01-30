
# Plan: Moduł sprzedaży biletów na wydarzenia (Paid Events / Ticket Shop)

## Przegląd

Moduł umożliwiający sprzedaż biletów na wydarzenia z integracją płatności PayU, automatycznym generowaniem biletów z kodem QR, systemem mailingowym i pełnym panelem administracyjnym.

---

## Architektura modułu

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAID EVENTS MODULE                              │
├─────────────────────────────────────────────────────────────────────────┤
│  PUBLIC LANDING PAGE          │  ADMIN PANEL                           │
│  /event/[slug]                │  /admin → "Płatne wydarzenia"          │
│  ├── Opis wydarzenia          │  ├── Lista wydarzeń                    │
│  ├── Grafika/banner           │  ├── Formularz tworzenia/edycji        │
│  ├── Prelegenci               │  ├── Pakiety cenowe                    │
│  ├── Harmonogram              │  ├── Prelegenci                        │
│  ├── Pakiety biletów          │  ├── Lista uczestników                 │
│  └── Przycisk "Kup bilet"     │  └── Ustawienia modułu                 │
├─────────────────────────────────────────────────────────────────────────┤
│                          PAYMENT FLOW                                   │
│  Formularz zakupu → Edge Function → PayU API → Webhook → Bilet + Email │
├─────────────────────────────────────────────────────────────────────────┤
│                          DATABASE TABLES                                │
│  paid_events │ paid_event_tickets │ paid_event_speakers │               │
│  paid_event_schedule │ paid_event_orders │ paid_events_settings        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Struktura bazy danych

### Tabela: `paid_events` - Główna tabela wydarzeń
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | Klucz główny |
| slug | text UNIQUE | URL-friendly identyfikator |
| title | text | Tytuł wydarzenia |
| description | text | Opis HTML/Markdown |
| short_description | text | Krótki opis na karty |
| banner_url | text | Grafika główna |
| location | text | Lokalizacja (adres lub "online") |
| event_date | timestamptz | Data i godzina wydarzenia |
| event_end_date | timestamptz | Data zakończenia |
| is_online | boolean | Czy wydarzenie online |
| stream_url | text | Link do transmisji (dla online) |
| max_tickets | int | Maksymalna liczba biletów |
| tickets_sold | int DEFAULT 0 | Sprzedane bilety |
| is_published | boolean | Czy widoczne publicznie |
| is_active | boolean | Czy aktywne |
| visible_to_everyone | boolean | Widoczność publiczna |
| visible_to_partners | boolean | Widoczność dla partnerów |
| visible_to_specjalista | boolean | Widoczność dla specjalistów |
| visible_to_clients | boolean | Widoczność dla klientów |
| created_by | uuid | Twórca |
| created_at, updated_at | timestamptz | Znaczniki czasu |

### Tabela: `paid_event_tickets` - Pakiety biletów
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | Klucz główny |
| event_id | uuid FK | Powiązanie z wydarzeniem |
| name | text | Nazwa pakietu (np. "Standard", "VIP") |
| description | text | Co zawiera pakiet |
| price_pln | int | Cena w groszach (1500 = 15.00 PLN) |
| quantity_available | int | Dostępna ilość |
| quantity_sold | int DEFAULT 0 | Sprzedana ilość |
| sale_start | timestamptz | Początek sprzedaży |
| sale_end | timestamptz | Koniec sprzedaży |
| is_active | boolean | Czy aktywny |
| position | int | Kolejność wyświetlania |

### Tabela: `paid_event_speakers` - Prelegenci
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | Klucz główny |
| event_id | uuid FK | Powiązanie z wydarzeniem |
| name | text | Imię i nazwisko |
| title | text | Tytuł/stanowisko |
| bio | text | Krótki opis |
| photo_url | text | Zdjęcie |
| position | int | Kolejność |

### Tabela: `paid_event_schedule` - Harmonogram
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | Klucz główny |
| event_id | uuid FK | Powiązanie z wydarzeniem |
| time_slot | time | Godzina (np. "10:00") |
| title | text | Tytuł punktu |
| description | text | Opis |
| speaker_id | uuid FK | Opcjonalnie: prelegent |
| position | int | Kolejność |

### Tabela: `paid_event_orders` - Zamówienia/Bilety
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | Klucz główny |
| event_id | uuid FK | Wydarzenie |
| ticket_id | uuid FK | Pakiet biletu |
| user_id | uuid | Jeśli zalogowany |
| email | text | Email kupującego |
| first_name | text | Imię |
| last_name | text | Nazwisko |
| phone | text | Telefon |
| quantity | int DEFAULT 1 | Ilość biletów |
| total_amount | int | Suma w groszach |
| status | text | 'pending', 'paid', 'cancelled', 'refunded' |
| payment_provider | text | 'payu' |
| payment_order_id | text | ID zamówienia PayU |
| payment_transaction_id | text | ID transakcji PayU |
| ticket_code | text UNIQUE | Unikalny kod biletu (do QR) |
| ticket_generated_at | timestamptz | Kiedy wygenerowano bilet |
| ticket_sent_at | timestamptz | Kiedy wysłano email z biletem |
| checked_in | boolean DEFAULT false | Czy zeskanowano przy wejściu |
| checked_in_at | timestamptz | Kiedy zeskanowano |
| created_at, updated_at | timestamptz | Znaczniki czasu |

### Tabela: `paid_events_settings` - Ustawienia globalne
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | Klucz główny |
| is_enabled | boolean | Moduł włączony globalnie |
| visible_to_admin | boolean | Widoczny dla admina |
| visible_to_partner | boolean | Widoczny dla partnerów |
| visible_to_specjalista | boolean | Widoczny dla specjalistów |
| visible_to_client | boolean | Widoczny dla klientów |
| payu_merchant_id | text | ID sprzedawcy PayU |
| payu_pos_id | text | POS ID PayU |
| payu_environment | text | 'sandbox' lub 'production' |
| default_currency | text DEFAULT 'PLN' | Waluta |
| company_name | text | Nazwa firmy na fakturach |
| company_nip | text | NIP |
| company_address | text | Adres |

---

## 2. Edge Functions

### `payu-create-order` - Tworzenie zamówienia PayU
```text
POST /payu-create-order
Body: { eventId, ticketId, quantity, buyer: { email, firstName, lastName, phone } }

Flow:
1. Walidacja danych + sprawdzenie dostępności biletów
2. Tworzenie rekordu w paid_event_orders (status: pending)
3. Generowanie unikalnego ticket_code
4. Wywołanie PayU API → POST /api/v2_1/orders
5. Zwrot redirectUri do klienta
```

### `payu-webhook` - Obsługa notyfikacji PayU
```text
POST /payu-webhook
Body: PayU notification JSON

Flow:
1. Weryfikacja podpisu (signature)
2. Aktualizacja statusu zamówienia
3. Jeśli COMPLETED:
   - Generowanie biletu PDF z QR
   - Wysłanie emaila z biletem
   - Aktualizacja tickets_sold
```

### `generate-event-ticket` - Generowanie biletu PDF
```text
POST /generate-event-ticket
Body: { orderId }

Flow:
1. Pobranie danych zamówienia i wydarzenia
2. Generowanie QR code z ticket_code
3. Renderowanie PDF z biletem
4. Upload do storage
5. Zwrot URL
```

### `send-event-ticket-email` - Wysyłka emaila z biletem
```text
POST /send-event-ticket-email
Body: { orderId }

Flow:
1. Pobranie danych
2. Użycie szablonu email
3. Załączenie biletu PDF
4. Wysyłka przez SMTP
```

### `verify-event-ticket` - Weryfikacja biletu (skanowanie QR)
```text
POST /verify-event-ticket
Body: { ticketCode }

Flow:
1. Wyszukanie zamówienia po ticket_code
2. Sprawdzenie statusu (paid, not checked_in)
3. Oznaczenie checked_in = true
4. Zwrot danych uczestnika
```

---

## 3. Komponenty frontend

### Strona publiczna wydarzenia: `/event/[slug]`
- **PaidEventLandingPage.tsx** - Główna strona wydarzenia
  - Banner/hero section
  - Opis wydarzenia (rich text)
  - Sekcja prelegentów z foto i bio
  - Harmonogram czasowy
  - Sekcja pakietów biletów z cenami
  - Formularz zakupu (modal/drawer)
  - Countdown do wydarzenia

### Panel admina: `/admin` → zakładka "Płatne wydarzenia"
- **PaidEventsManagement.tsx** - Główny komponent zarządzania
  - Lista wydarzeń z filtrowaniem
  - Statystyki sprzedaży
- **PaidEventForm.tsx** - Formularz tworzenia/edycji
  - Dane podstawowe
  - Upload grafiki
  - Edytor opisu (WYSIWYG)
- **PaidEventTicketsEditor.tsx** - Zarządzanie pakietami biletów
- **PaidEventSpeakersEditor.tsx** - Zarządzanie prelegentami
- **PaidEventScheduleEditor.tsx** - Edytor harmonogramu
- **PaidEventOrdersList.tsx** - Lista zamówień/uczestników
  - Export do Excel
  - Filtrowanie po statusie
  - Ręczne oznaczanie check-in
- **PaidEventsSettingsPanel.tsx** - Ustawienia globalne modułu
  - Włączanie/wyłączanie modułu
  - Konfiguracja PayU
  - Widoczność per rola

### Komponenty wspólne
- **TicketQRCode.tsx** - Generowanie QR dla biletu (używa `qrcode.react`)
- **PaidEventCard.tsx** - Karta wydarzenia (lista)
- **TicketPurchaseForm.tsx** - Formularz zakupu z walidacją
- **PaymentStatusBadge.tsx** - Badge statusu płatności

---

## 4. Integracja z PayU

### Wymagane sekrety (Edge Functions)
| Sekret | Opis |
|--------|------|
| PAYU_CLIENT_ID | OAuth client_id |
| PAYU_CLIENT_SECRET | OAuth client_secret |
| PAYU_MERCHANT_POS_ID | POS ID |
| PAYU_SECOND_KEY | MD5 key do weryfikacji |

### Flow płatności
```text
1. Użytkownik wybiera bilet → klik "Kup"
2. Wypełnia formularz (email, imię, nazwisko, telefon)
3. Frontend → POST /payu-create-order
4. Edge function:
   a) Pobiera token OAuth: POST /pl/standard/user/oauth/authorize
   b) Tworzy zamówienie: POST /api/v2_1/orders
   c) Zapisuje w bazie (status: pending)
   d) Zwraca redirectUri
5. Frontend przekierowuje na PayU
6. Użytkownik płaci
7. PayU → webhook → /payu-webhook
8. Jeśli COMPLETED → generuj bilet + wyślij email
9. Użytkownik wraca na continueUrl (strona potwierdzenia)
```

---

## 5. System mailingowy

### Szablony email do utworzenia
| Nazwa wewnętrzna | Kiedy wysyłany |
|------------------|----------------|
| `paid_event_ticket` | Po pomyślnej płatności - z biletem PDF |
| `paid_event_reminder_24h` | 24h przed wydarzeniem |
| `paid_event_reminder_1h` | 1h przed wydarzeniem (opcjonalnie) |

### Zawartość emaila z biletem
- Dane wydarzenia (tytuł, data, miejsce)
- Dane biletu (pakiet, ilość, kwota)
- QR code inline lub załącznik PDF
- Instrukcje dotarcia / link do streamu

---

## 6. Widoczność modułu w aplikacji

### Sidebar (DashboardSidebar.tsx)
Dodanie nowego wpisu w menu:
```typescript
{
  id: 'paid-events',
  icon: Ticket, // z lucide-react
  labelKey: 'Płatne wydarzenia',
  path: '/paid-events',
  visibleFor: [] // kontrolowane przez paid_events_settings
}
```

### Logika widoczności
1. Admin może włączyć/wyłączyć moduł globalnie
2. Admin może ustawić widoczność per rola
3. Jeśli wyłączony dla roli → element nie renderuje się w ogóle (zgodnie z zasadą projektu)

---

## 7. Weryfikacja biletów (check-in)

### Opcje weryfikacji
1. **Skanowanie QR w panelu admin** - dedykowana strona `/admin/ticket-scanner`
2. **API endpoint** - dla zewnętrznych czytników QR
3. **Manualne oznaczanie** - w liście uczestników

### Strona skanera QR (opcjonalna)
- Używa kamery urządzenia
- Wyświetla dane uczestnika po zeskanowaniu
- Przycisk "Potwierdź wejście"

---

## 8. Kolejność implementacji

### Faza 1: Baza danych i backend
1. Migracja SQL - wszystkie tabele
2. Polityki RLS
3. Edge function: `payu-create-order`
4. Edge function: `payu-webhook`

### Faza 2: Panel admina
5. `PaidEventsManagement.tsx` - lista wydarzeń
6. `PaidEventForm.tsx` - tworzenie/edycja
7. `PaidEventTicketsEditor.tsx` - pakiety
8. `PaidEventSpeakersEditor.tsx` - prelegenci
9. `PaidEventScheduleEditor.tsx` - harmonogram
10. `PaidEventsSettingsPanel.tsx` - ustawienia

### Faza 3: Strona publiczna
11. `PaidEventLandingPage.tsx`
12. `TicketPurchaseForm.tsx`
13. Integracja z PayU (redirect)

### Faza 4: Bilety i email
14. Edge function: `generate-event-ticket`
15. Edge function: `send-event-ticket-email`
16. Szablon email

### Faza 5: Zarządzanie uczestnikami
17. `PaidEventOrdersList.tsx`
18. Export do Excel
19. Strona weryfikacji QR

---

## 9. Uwagi techniczne

### PayU sandbox do testów
- URL: `https://secure.snd.payu.com`
- Test POS ID: `145227`
- Test MD5: `13a980d4f851f3d9a1cfc792fb1f5e50`

### Generowanie PDF z biletem
- Użycie `jsPDF` (już zainstalowane w projekcie)
- Osadzenie QR code jako base64

### Przechowywanie biletów
- Storage bucket: `event-tickets`
- Struktura: `{event_id}/{order_id}/ticket.pdf`

---

## Podsumowanie

Moduł zapewni pełen cykl sprzedaży biletów:
- Atrakcyjne strony wydarzeń z pełną informacją
- Różne pakiety cenowe z limitami
- Bezpieczne płatności przez PayU
- Automatyczne generowanie biletów z QR
- Zarządzanie uczestnikami i check-in
- Pełna kontrola widoczności per rola
