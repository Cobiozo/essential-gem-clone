## Problem

Na ekranie **Eventy → Weryfikacja biletów** po wybraniu wydarzenia „Kompleksowe szkolenie TEST" pojawia się czerwony toast:

> Błąd listy uczestników — Edge Function returned a non-2xx status code

W bazie wydarzenie ma 2 zamówienia (`paid_event_orders`, status `paid`), więc lista powinna się załadować. Funkcja `admin-list-event-orders` zwraca błąd (nie-2xx) zamiast danych. Logi edge nie zawierają szczegółów (brak `console.error` na poziomie zapytania), a wbudowany select PostgREST z osadzonymi tabelami (`paid_event_tickets(name)`, `paid_event_order_attendees(...)`) maskuje prawdziwą przyczynę.

## Zakres naprawy (tylko funkcja edge + drobny refactor frontu)

### 1. `supabase/functions/admin-list-event-orders/index.ts`

- Rozbić jedno duże zapytanie PostgREST z embedami na **dwa proste zapytania** (eliminuje wszelkie problemy z rozpoznawaniem relacji FK przez PostgREST):
  1. `paid_event_orders` — same kolumny, bez embedów.
  2. `paid_event_order_attendees` — `select(...).in('order_id', orderIds)`.
- Po stronie funkcji złączyć attendees do odpowiednich zamówień (`paid_event_order_attendees: AttendeeRow[]`) i zwrócić strukturę identyczną jak dotychczas, żeby front (`TicketVerification.tsx` i `EventFormsList.tsx`) działał bez zmian.
- Dodać pełniejsze `console.error` z `error.code` / `error.details` / `error.hint`, żeby kolejne błędy były widoczne w logach edge.
- Zachować obecny `verifyAdmin` + odpowiedzi 401/403/400.

### 2. Redeploy funkcji

- `deploy_edge_functions(["admin-list-event-orders"])` po zapisaniu zmian.

### 3. Walidacja

- Sprawdzić logi `admin-list-event-orders` zaraz po wdrożeniu (czy boot przechodzi czysto).
- Poprosić użytkownika o odświeżenie zakładki — lista uczestników powinna pokazać 2 wpisy dla „Kompleksowe szkolenie TEST".

## Czego NIE zmieniam

- `EventFormsList.tsx`, `EventFormConfirmPage.tsx`, `confirm-event-form-email/index.ts` — pozostają nietknięte (nie dotyczą tego błędu).
- Schemat bazy, RLS, granty — nie ruszamy.
- UI `TicketVerification.tsx` — bez zmian, wyłącznie poprawka backendowa.
