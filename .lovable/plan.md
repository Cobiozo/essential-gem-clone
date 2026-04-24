## Cel

Po wybraniu biletu i kliknięciu "Zapisz się" gość ma widzieć opcje płatności **zgodne z konfiguracją admina dla danego wydarzenia**:

- **A) Płatność online (PayU)** — obecny przepływ "Przejdź do płatności" z przekierowaniem do PayU.
- **B) Rejestracja + email z danymi do przelewu** — gość zostaje zarejestrowany jako oczekujący (`status = 'awaiting_transfer'`), dostaje email "Twoja rezerwacja została przyjęta. Czekamy na płatność na rachunek: [dane]", a admin/partner widzą zgłoszenie w CRM.

Admin może włączyć **jedną z opcji** lub **obie naraz** (gość wybiera w drawerze).

## Zmiany w bazie (migracja)

Dodać do `paid_events` trzy kolumny konfiguracyjne (poziom wydarzenia — najprostsze i wystarczające):

- `payment_method_payu boolean DEFAULT true` — pokaż przycisk "Przejdź do płatności (PayU)".
- `payment_method_transfer boolean DEFAULT false` — pokaż przycisk "Zarejestruj mnie i wyślij dane do przelewu".
- `transfer_payment_details text NULL` — treść instrukcji przelewu (numer konta, tytuł, termin), wstawiana do emaila i strony potwierdzenia.

Dodać do `paid_event_orders` (tabela istniejąca dla zamówień PayU):
- rozszerzyć dozwolone wartości `status` o `'awaiting_transfer'` (jeżeli jest CHECK constraint — zaktualizować; jeżeli enum — dodać wartość).
- `payment_method text DEFAULT 'payu'` (`'payu'` | `'transfer'`).

## Panel admina (Edytor wydarzenia)

W `EventTicketsPanel.tsx` (lub osobnej sekcji "Płatności" w edytorze wydarzenia — preferowane: nowa karta `EventPaymentMethodsPanel.tsx` w `src/components/admin/paid-events/editor/`):
- Dwa przełączniki (Switch): "Płatność online PayU", "Płatność przelewem (rejestracja + email)".
- Pole tekstowe (Textarea) "Dane do przelewu" — widoczne gdy włączony przelew. Placeholder z przykładem (Odbiorca, IBAN, BIC, tytuł, termin).
- Walidacja: co najmniej jedna metoda musi być włączona; jeżeli włączony przelew → pole danych do przelewu wymagane.
- Zapis do `paid_events` (`payment_method_payu`, `payment_method_transfer`, `transfer_payment_details`).

## Zmiany w `PurchaseDrawer.tsx`

- Pobierać z propsa konfigurację: `paymentMethodPayu: boolean`, `paymentMethodTransfer: boolean`, `transferPaymentDetails: string | null`.
- Renderować w stopce drawera jeden lub dwa przyciski (zależnie od konfiguracji):
  - "Przejdź do płatności" (PayU) — obecna logika `payu-create-order`.
  - "Zarejestruj mnie i wyślij dane do płatności" — nowa edge function `register-event-transfer-order`.
- Jeżeli admin włączył tylko jedną metodę → tylko ten przycisk; jeżeli obie → oba widoczne (drugi jako `variant="outline"`).
- Walidacja imię/nazwisko/email/telefon/zgody — wspólna dla obu przycisków.

## Nowa edge function `register-event-transfer-order`

`supabase/functions/register-event-transfer-order/index.ts`:
- Wejście: `eventId`, `ticketId`, dane kupującego, zgody, opcjonalny `refCode` (partner).
- Tworzy rekord w `paid_event_orders` z `payment_method = 'transfer'`, `status = 'awaiting_transfer'`, generuje `ticket_code` (jak w PayU, ale jeszcze nieaktywny do wykorzystania — admin oznacza opłacone w `admin-mark-event-payment`).
- Resolves partner po `refCode` i zapisuje `partner_user_id`.
- Wysyła email do gościa przez SMTP (analogicznie do `send-event-form-confirmation`) z:
  - dual-brand header (Pure Life + Eqology IBP),
  - potwierdzeniem rezerwacji,
  - **danymi do przelewu z `paid_events.transfer_payment_details`**,
  - informacją: "Po zaksięgowaniu wpłaty otrzymasz email z biletem QR".
- Tworzy `user_notifications` dla wszystkich adminów oraz partnera-zapraszającego ("📥 Nowa rezerwacja oczekująca na przelew: [Imię Nazwisko], [bilet]").
- Aktualizuje/tworzy wpis w `team_contacts` partnera (notatka: "📥 Zarezerwował bilet (oczekuje na przelew)").
- Zwraca `{ success: true, orderId }` — front pokazuje ekran sukcesu "Rezerwacja przyjęta. Sprawdź email z danymi do przelewu."

## Przepływ płatności manualnej (uzupełnienie)

`admin-mark-event-payment` już istnieje — admin może oznaczyć zamówienie jako opłacone, co powinno wówczas wygenerować bilet QR i wysłać go do gościa. Sprawdzimy/uzupełnimy logikę, żeby obsługiwała `payment_method = 'transfer'` analogicznie do PayU sukcesu (wysłanie biletu, zmiana statusu na `paid`, powiadomienia).

## Podsumowanie plików

**Migracja:**
- nowa migracja: kolumny w `paid_events` + rozszerzenie statusu/`payment_method` w `paid_event_orders`.

**Frontend:**
- `src/components/admin/paid-events/editor/EventPaymentMethodsPanel.tsx` (nowy) — sekcja konfiguracji metod.
- `src/components/admin/paid-events/editor/PaidEventEditor.tsx` (lub odpowiednik) — dodanie nowej sekcji do edytora.
- `src/components/paid-events/public/PurchaseDrawer.tsx` — dwa przyciski + obsługa drugiej akcji.
- `src/pages/PaidEventPage.tsx` — pobranie nowych pól i przekazanie do `PurchaseDrawer`.

**Backend (Edge Functions):**
- `supabase/functions/register-event-transfer-order/index.ts` (nowy).
- `supabase/functions/admin-mark-event-payment/index.ts` — drobna aktualizacja (obsługa wysyłki biletu po oznaczeniu przelewu jako opłaconego, jeśli jeszcze nie jest).
