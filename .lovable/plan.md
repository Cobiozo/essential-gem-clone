## Diagnoza

Błąd nadal pochodzi z wywołania Edge Function `admin-list-event-orders` w zakładce **Weryfikacja biletów**. Dane w bazie są poprawne: wydarzenie „Kompleksowe szkolenie TEST” ma 2 opłacone zamówienia i po 1 uczestniku w każdym. Problem jest więc po stronie sposobu pobierania danych/autoryzacji funkcji, nie po stronie braku rejestracji.

W obecnym kodzie frontend pokazuje tylko ogólny komunikat Supabase: `Edge Function returned a non-2xx status code`, więc nie widać, czy realnie jest to 401/403/500. Logi funkcji pokazują bootowanie, ale brak szczegółowego logu przy odrzuceniu autoryzacji.

## Plan naprawy

1. **Dodać czytelne logowanie i komunikaty błędów w `admin-list-event-orders`**
   - Zalogować etap: start requestu, brak tokenu, niepoprawny token, brak roli admin, błąd zapytań.
   - Zwracać JSON z kodem błędu (`unauthorized`, `forbidden`, `orders_query_failed`) zamiast samego ogólnego statusu.

2. **Wzmocnić frontend `TicketVerification.tsx`**
   - Przy błędzie Edge Function odczytać treść odpowiedzi HTTP z `FunctionsHttpError.context`.
   - Pokazywać prawdziwy komunikat administracyjny zamiast ogólnego `Edge Function returned a non-2xx status code`.
   - Dzięki temu, jeśli problemem jest sesja/rola, będzie to widoczne wprost.

3. **Dodać bezpieczny fallback bez Edge Function dla listy uczestników**
   - Jeśli funkcja nadal zwróci błąd, frontend spróbuje pobrać `paid_event_orders` i `paid_event_order_attendees` bezpośrednio przez istniejące RLS dla zalogowanego admina.
   - Dane zostaną scalone do tej samej struktury co obecnie, żeby lista uczestników działała bez zmiany UI.
   - Jeśli fallback zadziała, użytkownik od razu zobaczy 2 uczestników zamiast pustej listy.

4. **Wdrożyć ponownie Edge Function i zweryfikować**
   - Wdrożyć `admin-list-event-orders`.
   - Sprawdzić funkcję dla wydarzenia `Kompleksowe szkolenie TEST`.
   - Oczekiwany efekt: w **Lista uczestników** ma być `2 zarejestrowanych`, a toast błędu ma zniknąć albo zawierać konkretną przyczynę, jeśli sesja admina jest niepoprawna.

## Pliki do zmiany

- `supabase/functions/admin-list-event-orders/index.ts`
- `supabase/functions/_shared/admin-auth.ts` — tylko jeżeli będzie potrzebne doprecyzowanie logów autoryzacji
- `src/components/admin/paid-events/TicketVerification.tsx`