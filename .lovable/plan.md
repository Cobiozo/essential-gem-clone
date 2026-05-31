## Cel
Dodać schemat **bezpłatnej rejestracji na wydarzenie** z dwustopniowym potwierdzeniem (Double Opt-In) — analogiczny do płatnych biletów, ale bez płatności. Bilet (z numerem, danymi rezerwującego i kodem QR) wysyłany jest dopiero po kliknięciu linku potwierdzającego adres email.

## Przepływ użytkownika (krok po kroku)
1. **Admin** w edytorze wydarzenia w panelu „Metody płatności" włącza nowy przełącznik **„Wydarzenie bezpłatne (rezerwacja z potwierdzeniem email)"**. Gdy włączony — pozostałe metody (PayU / przelew / PayPal) są wyszarzone i nieaktywne. Cena biletu ignorowana (traktowana jak 0).
2. **Gość/Partner** na stronie wydarzenia widzi przycisk **„Zarezerwuj bezpłatnie"** zamiast „Kup bilet". Otwiera się drawer z formularzem: imię, nazwisko, email, telefon + **obowiązkowy checkbox**: *„Świadomie deklaruję obecność tego dnia i zobowiązuję się do uczestnictwa w wydarzeniu."*
3. Po wysłaniu → zamówienie zapisane ze statusem `awaiting_email_confirmation`. Wyświetla się **baner sukcesu** w drawerze: *„Rezerwacja przyjęta. Sprawdź skrzynkę {email} — wysłaliśmy link potwierdzający adres email. Bilet otrzymasz po kliknięciu w link."*
4. Klient dostaje **email #1 (potwierdzenie adresu)** z brandingiem wydarzenia i przyciskiem CTA **„Potwierdzam mój adres email"** → kieruje na `/events/confirm-reservation/:token`.
5. Po kliknięciu: token weryfikowany, status zmienia się na `paid` (lub nowy `confirmed`), generowany jest `ticket_code` + PDF biletu (istniejąca funkcja `generate-event-ticket-pdf`), wysyłany **email #2 (bilet)** z PDF + kodem QR. Strona pokazuje sukces.
6. **Admin → panel weryfikacji** widzi bilet na liście, może go zeskanować/zweryfikować jak każdy inny (istniejąca infrastruktura `TicketVerification` + `verify-event-ticket`).

## Zmiany techniczne

### Migracja DB
- `paid_events`: + `is_free boolean NOT NULL DEFAULT false`, + `free_event_consent_text text` (opcjonalny custom tekst zgody, domyślnie z aplikacji).
- `paid_event_orders`: + `email_confirmation_token text UNIQUE`, + `email_confirmation_sent_at timestamptz`, + `email_confirmed_at timestamptz`. Dopuścić nowy status `awaiting_email_confirmation` (kolumna już jest `text`, brak CHECK constraint — wystarczy frontend).
- Index na `email_confirmation_token`.

### Admin UI
- `EventPaymentMethodsPanel.tsx`: nowy **pierwszy** kafelek „Wydarzenie bezpłatne" (Switch). Gdy włączony → ukryj/zablokuj pozostałe 3 metody i pokaż info: *„Rezerwacja bezpłatna z potwierdzeniem email — bilety wysyłane automatycznie po potwierdzeniu."* Walidacja: gdy `is_free=true`, pomiń wymóg ≥1 metody płatności.

### Frontend public
- `PaidEventPage.tsx` + `PurchaseDrawer.tsx`: jeśli `event.is_free` → tryb „free reservation":
  - Ukryj wybór metody płatności i cenę.
  - Pokaż obowiązkowy checkbox zgody-zobowiązania.
  - Submit → wywołanie nowej edge function `register-free-event-order`.
  - Po sukcesie: pełnoekranowy baner sukcesu z instrukcją sprawdzenia maila (bez przekierowania na checkout).
- Nowa strona `src/pages/FreeEventConfirmPage.tsx` na trasie `/events/confirm-reservation/:token` → wywołuje `confirm-free-event-reservation` → pokazuje stan: ładowanie / sukces („Email potwierdzony, bilet wysłany na {email}") / błąd (token nieprawidłowy/wygasły/już użyty). Dodać do `App.tsx` jako publiczna trasa.

### Edge Functions (nowe)
- `register-free-event-order`:
  - Waliduje `event.is_free=true`, sprawdza limit miejsc (`max_tickets` / `quantity_available`), brak duplikatu email dla danego eventu.
  - Tworzy order: `status='awaiting_email_confirmation'`, `total_amount=0`, `payment_provider='free'`, generuje `email_confirmation_token` (crypto.randomUUID + 32-bytes hex), `email_confirmation_sent_at=now()`.
  - Wysyła email #1 (SMTP, branding wydarzenia) z linkiem `${SITE_URL}/events/confirm-reservation/{token}`.
- `confirm-free-event-reservation`:
  - Znajduje order po `email_confirmation_token`.
  - Sprawdza: nie wygasł (TTL np. 7 dni), nie był już potwierdzony.
  - Ustawia `email_confirmed_at=now()`, `status='paid'`, generuje `ticket_code`, ustawia `ticket_generated_at`.
  - Wywołuje wewnętrznie `generate-event-ticket-pdf` (lub inline renderuje PDF analogicznie do `register-event-transfer-order`).
  - Wysyła email #2 z biletem (PDF + QR), ustawia `ticket_sent_at`.
  - Zwraca `{success, email}` do strony.

### Bezpieczeństwo
- Tokeny 256-bit, unique, jednorazowe (sprawdzane przez `email_confirmed_at IS NULL`).
- Edge functions z `SUPABASE_SERVICE_ROLE_KEY` (bypassują RLS w kontrolowany sposób).
- Limit prób potwierdzenia (TTL 7 dni — po tym order zostaje `awaiting_email_confirmation` ale link zwraca błąd).
- Walidacja po stronie serwera: nie generujemy biletu, jeśli `event.is_free=false` (ochrona przed użyciem ścieżki dla płatnych).

## Testowanie krok po kroku
1. Włącz `is_free` na evencie testowym → zapis.
2. Otwórz publiczną stronę → drawer pokazuje formularz bezpłatny + checkbox.
3. Submit bez checkboxa → błąd walidacji.
4. Submit z checkboxem → baner sukcesu + status w DB = `awaiting_email_confirmation`, brak `ticket_code`.
5. Sprawdź email #1 → kliknij CTA.
6. Strona `/events/confirm-reservation/:token` → sukces, status zmienia się na `paid`, generuje się `ticket_code` i `ticket_pdf_url`.
7. Sprawdź email #2 → bilet PDF z QR + imię, nazwisko, numer.
8. Panel admina → weryfikacja: zeskanuj QR → status „checked_in" działa.
9. Ponowne kliknięcie linku → komunikat „już potwierdzony".
10. Próba rejestracji z tym samym emailem na ten sam event → odpowiedni komunikat.

## Pliki
**Nowe:**
- `supabase/migrations/<ts>_add_free_event_reservation.sql`
- `supabase/functions/register-free-event-order/index.ts`
- `supabase/functions/confirm-free-event-reservation/index.ts`
- `src/pages/FreeEventConfirmPage.tsx`

**Edytowane:**
- `src/components/admin/paid-events/editor/EventPaymentMethodsPanel.tsx`
- `src/components/paid-events/public/PurchaseDrawer.tsx`
- `src/pages/PaidEventPage.tsx`
- `src/App.tsx` (nowa trasa)
- `src/integrations/supabase/types.ts` (auto po migracji)

## Plan wdrożenia
Migracja → edge functions → admin toggle → frontend drawer + strona potwierdzająca → testy E2E krok po kroku.
