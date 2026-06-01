## Problem

W `EventFormsList` (zakładka Eventy → Formularze) licznik "X zapisanych" liczy tylko rekordy z tabeli `event_form_submissions`. Tymczasem widok szczegółowy "Zgłoszenia: Rejestracja" scala dwa źródła:
- `event_form_submissions` (rejestracje gości przez publiczny formularz),
- `paid_event_orders` dla `event_id` przypisanego do formularza (rejestracje zalogowanych partnerów).

Stąd rozbieżność: Sebastian Snopek (Partner) jest w `paid_event_orders`, więc widnieje w liście (1), ale nagłówek pokazuje 0.

## Rozwiązanie

W `src/components/admin/paid-events/event-forms/EventFormsList.tsx` rozszerzyć licznik tak, żeby logika była identyczna jak w `EventFormSubmissions`:

1. W zapytaniu `forms` już mamy `event_id` — zebrać listę `eventIds` z formularzy mających `event_id`.
2. Dodać równolegle drugi query (lub rozszerzyć istniejący `countMap`) który pobiera `paid_event_orders` ograniczone do `event_id IN (eventIds)`, kolumny: `event_id, status`, filtr `status != 'cancelled'`.
3. Zbudować mapę `eventId -> { total, paid }` po stronie zamówień, gdzie `paid` = `status in ('paid','confirmed','completed')`.
4. Przy renderowaniu wiersza formularza sumować dla danego formularza:
   - `submissions[form.id]` (jak dziś) + `orders[form.event_id]` dla obu pól `total` i `paid`.
5. Badge "X zapisanych" / "Y opłaconych" używa zsumowanych wartości.

Fallback: jeżeli bezpośredni `select` na `paid_event_orders` zwróci błąd RLS lub pustą tablicę (jak w `EventFormSubmissions`), użyć edge funkcji `admin-list-event-orders` per event_id — ale tylko gdy direct select faktycznie zawiedzie. Dla wydajności: jeden zbiorczy direct select po `in('event_id', eventIds)` na początek; jeżeli błąd — pętla po eventach z edge fn (równolegle przez `Promise.all`).

## Zakres zmian

- `src/components/admin/paid-events/event-forms/EventFormsList.tsx` — rozszerzenie liczenia w `countMap` (jeden plik, brak zmian backendowych / RLS / edge functions).

Brak zmian w bazie danych, edge functions, ani w komponencie `EventFormSubmissions` (tam logika jest już poprawna).