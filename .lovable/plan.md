## Problem

Gość po potwierdzeniu maila (free event) zobaczył banner z tekstem przeznaczonym dla rezerwacji z przelewem:

> „Teraz oczekujemy na płatność na dane wskazane w wysłanym e-mailu. Po zaksięgowaniu wpłaty otrzymasz bilet…"

Dla wydarzenia bezpłatnego nie powinno być żadnej wzmianki o płatności.

## Przyczyna

W `src/pages/EventFormConfirmPage.tsx` (linie 60-97) są dwie gałęzie:
- `isFree === true` → komunikat bez płatności (obecny tekst też wymaga poprawy do dokładnego brzmienia)
- `isFree === false` → komunikat o przelewie (ten, który widać na screenie)

Wartość `isFree` pochodzi z edge-funkcji `confirm-event-form-email`, która sprawdza `paid_events.is_free`, a w fallbacku ceny biletów (`paid_event_tickets.price_pln`). Jeśli dane wydarzenie ma `is_free=false` i istnieje choć jeden bilet płatny (np. partnerski/VIP), fallback nie ustawi `is_free=true` nawet gdy gość rezerwuje bilet bezpłatny — wtedy ekran pokazuje gałąź „płatność".

## Plan naprawy

### 1. `src/pages/EventFormConfirmPage.tsx`
Zmienić tekst w gałęzi `isFree` (linie 66-79) na dokładnie wymagane brzmienie (jeden komunikat, bez separatora „Dziękujemy…" na osobnej linii):

```
Twoje dane i rejestracja zostały poprawnie potwierdzone.
W kolejnym mailu otrzymasz swój bilet do uczestnictwa w wydarzeniu.
Dziękujemy i do zobaczenia na wydarzeniu!
```

Nagłówek „Twoje dane i rejestracja zostały poprawnie potwierdzone" zostaje jako `<h1>` (już jest), a treść poniżej staje się dwoma akapitami:
1. „W kolejnym mailu otrzymasz swój bilet do uczestnictwa w wydarzeniu."
2. „Dziękujemy i do zobaczenia na wydarzeniu!"

Komunikat „(Twoja rejestracja była już potwierdzona wcześniej.)" dla stanu `already` zostawiamy bez zmian.

### 2. `supabase/functions/confirm-event-form-email/index.ts` — poprawa detekcji „bezpłatne dla gościa"
W bloku `is_free` (linie 278-309) dodać dodatkowe rozpoznanie: jeśli zgłoszenie gościa (`event_form_submissions`) ma powiązany `ticket_id` wskazujący na bilet o `price_pln = 0`, ustawić `is_free = true` niezależnie od `paid_events.is_free` i innych biletów.

Logika:
1. Po pobraniu `sub.event_id` dociągnąć też `sub.selected_ticket_id` (lub odpowiednią kolumnę, którą formularz zapisuje — sprawdzić w schemacie `event_form_submissions`).
2. Jeśli `selected_ticket_id` istnieje, pobrać `price_pln` tego konkretnego biletu i — przy `price_pln === 0` — wymusić `is_free = true`.
3. Dotychczasowy fallback po wszystkich biletach zostaje jako ostatnia deska ratunku.

Dzięki temu gość, który rezerwuje darmowe miejsce na wydarzeniu mającym też płatne pule, zawsze trafi w gałąź free i zobaczy poprawny komunikat oraz dostanie bilet w osobnym mailu.

### 3. Weryfikacja
- Otworzyć link potwierdzający z testowego maila gościa na wydarzeniu bezpłatnym → banner pokazuje wyłącznie nową treść, bez wzmianki o płatności.
- Powtórzyć dla wydarzenia z mieszanymi pulami (free + paid), wybierając pulę bezpłatną → ten sam komunikat.
- Dla zarejestrowanego partnera z przelewem na płatne wydarzenie tekst „Teraz oczekujemy na płatność…" pozostaje bez zmian (gałąź `!isFree`).

## Czego NIE zmieniamy
- Gałęzi paid (`!isFree`) — komunikat o przelewie dla partnera z płatnym biletem zostaje.
- Logiki wystawiania biletu PDF (`issueFreeTicketForOrder`) i maila z biletem — nie wpływa na ten ekran.
- Tłumaczeń i innych ekranów potwierdzeń.
