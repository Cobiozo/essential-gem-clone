## Problem

W liście formularzy widać "3 zapisanych / 3 opłaconych", ale po wejściu w zgłoszenia są tylko 2 osoby (Jan Kowalski – gość, Sebastian Snopek – partner).

Przyczyna: w `EventFormsList.tsx` licznik sumuje **niezależnie** wszystkie wpisy z `event_form_submissions` + wszystkie wpisy z `paid_event_orders` dla danego wydarzenia. Dla wydarzenia bezpłatnego każdy gość ma teraz JEDNO submission ORAZ powiązany order (utworzony przez `confirm-event-form-email`). Więc Jan jest liczony 2× (1 submission + 1 order), a Sebastian 1× (tylko submission, bo partner zwykle nie generuje osobnego order) — łącznie 3 zamiast 2.

To samo dotyczy badge'a "opłaconych" oraz innych wydarzeń na liście (np. Kraków pokazuje 81/16, choć realna liczba unikalnych osób jest mniejsza).

## Plan naprawy (tylko frontend / logika prezentacji)

Plik: `src/components/admin/paid-events/event-forms/EventFormsList.tsx`

1. Zmienić query `event-form-order-counts` tak, aby zamiast samych zliczeń zwracało listę zamówień z polami: `event_id, status, email, submitted_data` — albo równolegle dociągnąć `event_form_submissions` z polami `event_id, form_id, email, submitted_data, payment_status` (już mamy formy z `event_id`).

2. Zbudować nowy `countMap` z deduplikacją per formularz po kluczu unikalności osoby:
   - Klucz: `order_id` zapisany w `submitted_data.order_id` submission → traktujemy submission + powiązany order jako JEDEN rekord.
   - Pozostałe orders (orphan — bez submission po `order_id`) dodatkowo dedup po `lower(email) + event_id`, aby orphan order o tym samym mailu co submission nie podwajał liczby.
   - Wynik dla formularza:
     - `total` = liczba unikalnych osób (submissions formularza + orphan orders danego event_id niezmapowane na żadne submission tego formularza).
     - `paid` = liczba tych unikalnych osób, dla których albo `submission.payment_status = 'paid'`, albo powiązany/orphan order ma `status ∈ {paid, confirmed, completed}`.

3. Zostawić obecny fallback przez `admin-list-event-orders` (gdy bezpośrednie SELECT z `paid_event_orders` jest zablokowane RLS), tylko stosując tę samą dedup logikę.

4. Nie zmieniamy backendu, edge functions ani schematu DB — wystarczy poprawić agregację w jednym pliku.

## Efekt

- "Rejestracja / Kompleksowe szkolenie TEST" pokaże `2 zapisanych / 2 opłaconych` zgodne z widokiem zgłoszeń.
- Pozostałe wydarzenia również przestaną podwajać gości bezpłatnych potwierdzonych mailowo.
