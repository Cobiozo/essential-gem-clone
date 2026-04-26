## Problem

1. **Mail do partnerów po rejestracji na wydarzenie nie ma przycisku „Potwierdzam otrzymanie wiadomości" ani linku „Anuluj rejestrację"** — w przeciwieństwie do maila gości niezalogowanych. W efekcie kolumna „Email" w panelu admina pozostaje na zawsze w stanie `Wysłany — czeka` i partner nie może anulować zgłoszenia z poziomu maila.

2. W treści maila partnera fraza „…wyślemy do Ciebie email z biletem **i** kodem QR…" powinna brzmieć „…z biletem **i/lub** kodem QR…".

## Rozwiązanie

### 1. Dodanie CTA „Potwierdzam" + linku „Anuluj" w mailu partnera

Tabela `event_form_submissions` ma już kolumny `confirmation_token` i `cancellation_token` (auto-generowane DB defaultem `gen_random_bytes(32)`), a w aplikacji istnieją gotowe trasy `/event-form/confirm/:token` i `/event-form/cancel/:token` wraz z funkcjami `confirm-event-form-email` i `cancel-event-form-submission`. Wystarczy podpiąć je do maila zamówienia biletu.

W `supabase/functions/register-event-transfer-order/index.ts`:

a) **Mirror order → submission**: rozszerzyć obecne zapytania, by zwracały tokeny:
   - `insert(...).select('id, confirmation_token, cancellation_token').single()` — przy nowym zgłoszeniu,
   - `select('id, submitted_data, confirmation_token, cancellation_token')` — przy istniejącym (powtórne zamówienie tej samej osoby).
   
   Tokeny przekazać dalej przez closure do bloku wysyłki maila.

b) **`buildEmail(...)`**: dodać opcjonalne pola `confirmUrl` i `cancelUrl`. Gdy są ustawione, wstawić:
   - **NAD danymi do przelewu** żółty przycisk `✅ Potwierdzam otrzymanie wiadomości` (identyczny styl jak w mailu gościa),
   - **NA DOLE** sekcji wiadomości link `Chcesz anulować zgłoszenie? Anuluj rejestrację` (czerwony, taki sam jak u gości).

c) **Budowanie URL-i**: użyć tego samego wzorca co w `send-event-form-confirmation`:
   ```
   const publicBaseUrl = Deno.env.get('PUBLIC_EMAIL_LINK_BASE_URL')
     || Deno.env.get('PUBLIC_SITE_URL')
     || 'https://purelife.info.pl';
   const confirmUrl = `${publicBaseUrl}/event-form/confirm/${confirmation_token}`;
   const cancelUrl  = `${publicBaseUrl}/event-form/cancel/${cancellation_token}`;
   ```

   Linki działają niezależnie od logowania (publiczne strony obsługują tokeny), więc partnerzy klikają je tak samo jak goście.

### 2. Zmiana frazy w mailu

W tym samym `buildEmail(...)`:
- z: „wyślemy do Ciebie email z biletem **i** kodem QR potrzebnym do wejścia na wydarzenie."
- na: „wyślemy do Ciebie email z biletem **i/lub** kodem QR potrzebnym do wejścia na wydarzenie."

### 3. Wdrożenie

Po edycji wymagany jest redeploy edge function `register-event-transfer-order`, żeby zmiany zaczęły działać produkcyjnie.

## Pliki

- `supabase/functions/register-event-transfer-order/index.ts`
  - rozszerzenie sygnatury `buildEmail` o `confirmUrl`/`cancelUrl`,
  - dodanie sekcji CTA i linku „Anuluj" w HTML maila,
  - poprawka tekstu „i" → „i/lub",
  - pobranie `confirmation_token`/`cancellation_token` z mirrorowanego wpisu i zbudowanie URL-i przed wywołaniem `buildEmail`.

## Efekt

Każdy email po rezerwacji biletu (zarówno dla zalogowanego partnera, jak i dla gościa) zawiera ten sam komplet kontroli: żółty przycisk potwierdzenia oraz czerwony link anulowania. Po kliknięciu „Potwierdzam" w panelu admina (`Eventy → Formularze → Zgłoszenia`) partner przestaje widnieć jako `Wysłany — czeka` i otrzymuje status `Potwierdził`. Tekst maila informuje precyzyjnie, że bilet i/lub kod QR będą dostarczone po zaksięgowaniu wpłaty.