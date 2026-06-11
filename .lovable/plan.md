## Problem

Józef Pyza (nowy gość PLC) widzi na liście wydarzeń komunikat „jesteś zarejestrowany", mimo że nigdy się nie rejestrował. Powodem są historyczne rekordy po usuniętym koncie Romanka Romano, który miał ten sam e-mail. Aplikacja w kilku miejscach dopasowuje „moje" rejestracje/bilety po **adresie e-mail** zalogowanego użytkownika — bez sprawdzania, czy rekord należał do konta, które zostało usunięte/zanonimizowane.

Reguła docelowa: **konto usunięte = zero powiązań**. Po usunięciu konta żadne historyczne wpisy nie mogą być prezentowane jako „twoje" dla kolejnego użytkownika, nawet jeśli zarejestruje się na ten sam e-mail.

## Gdzie leży błąd

Dopasowanie po `email` bez filtra `account_deleted_at IS NULL` (i bez wymagania, że `user_id` jest pusty) znajduje się w:

1. RPC `public.get_my_event_orders` (`supabase/migrations/20260601072932_*.sql`) — `WHERE o.user_id = me.uid OR lower(o.email) = me.em`.
2. `src/components/paid-events/MyEventTicketsInline.tsx`:
   - fallback do `paid_event_orders` (linia ~60, `email.eq.<email>`),
   - fallback do `event_form_submissions` po `emails` (linia ~94).
3. `src/components/paid-events/public/PurchaseDrawer.tsx` — sprawdzenie „czy już kupiłem bilet" przez `paid_event_orders`, `paid_event_order_attendees` oraz `event_form_submissions` po `emails`.

Stamping przy usuwaniu konta (`supabase/functions/_shared/account-deletion-stamp.ts`) już zapisuje `account_deleted_at` / `account_deleted_snapshot` na `paid_event_orders`, `paid_event_order_attendees`, `event_form_submissions`, `guest_event_registrations`. Trzeba to po stronie odczytu uwzględnić.

## Plan zmian

### 1. Migracja: nowa wersja `get_my_event_orders`
- `CREATE OR REPLACE FUNCTION public.get_my_event_orders(uuid)` z tą samą sygnaturą, ale z warunkiem:
  ```sql
  WHERE o.event_id = p_event_id
    AND auth.uid() IS NOT NULL
    AND o.account_deleted_at IS NULL
    AND (
      o.user_id = me.uid
      OR (o.user_id IS NULL AND lower(o.email) = me.em)
    )
  ```
- `account_deleted_at IS NULL` blokuje rekordy po usuniętym/zanonimizowanym koncie.
- `o.user_id IS NULL` przy dopasowaniu po e-mailu sprawia, że historyczne zamówienia poprzedniego właściciela (które miały `user_id = <stary uuid>`) nie wpadają nowemu użytkownikowi — dopasowanie po e-mailu działa tylko dla rezerwacji gościnnych (jeszcze nie zlinkowanych do konta).

### 2. `MyEventTicketsInline.tsx`
- Fallback `paid_event_orders` po e-mailu: dodać `.is('account_deleted_at', null)` i ograniczyć email-OR do rekordów bez `user_id` (przez osobne zapytanie albo użycie `or(...)` z `user_id.is.null,email.eq.<email>` zgrupowane w nawiasie — najprościej: jedno zapytanie `user_id.eq.<uid>` + drugie po e-mailach z filtrami `user_id IS NULL` i `account_deleted_at IS NULL`, scalenie wyników po `id`).
- Fallback `event_form_submissions`: dodać `.is('account_deleted_at', null)` oraz `.is('user_id', null)` (kolumna istnieje w `event_form_submissions`).

### 3. `PurchaseDrawer.tsx`
- W zapytaniach „czy mam już bilet" (`paid_event_orders`, `paid_event_order_attendees`, `event_form_submissions`) dodać `.is('account_deleted_at', null)`; przy dopasowaniach po `email` wymagać, by `user_id` był pusty (analogicznie jak w pkt 2), żeby cudze, zanonimizowane konta nie blokowały zakupu.

### 4. (Higiena) `guest_event_registrations`
- Tabela ma już `inviter_deleted_at` (zaproszony przez usuniętego partnera) i `account_deleted_at` (na samej rejestracji). Aktualnie żaden ekran NIE pokazuje Józefowi „twoja rejestracja" na podstawie e-maila z tej tabeli, więc nie zmieniamy logiki UI. Zostawiamy zapytania administracyjne (`team_contacts`, panel admina, leader stats) bez zmian — to są widoki historyczne, nie „moje".

### 5. Bez zmian wstecznych
- Nie ruszamy `event_registrations` — tam dopasowanie idzie po `user_id`, więc problemu nie ma.
- Nie kasujemy historycznych rekordów Romanka — pozostają z `account_deleted_at`/snapshotami dla księgowości i panelu admina, ale przestają „przeciekać" do nowego konta.

## Pliki

- `supabase/migrations/<nowa>.sql` — nowa wersja `get_my_event_orders`.
- `src/components/paid-events/MyEventTicketsInline.tsx`
- `src/components/paid-events/public/PurchaseDrawer.tsx`

## Walidacja po wdrożeniu

1. Zalogować się jako Józef Pyza → wejść na `/eventy` i kartę paid event, na którym wcześniej rejestrował się Romanek z tym samym e-mailem → komunikat „Twoje bilety" / „jesteś zarejestrowany" ma zniknąć, ma się pojawić standardowy ekran rejestracji.
2. Zalogować się jako użytkownik, który ma własną aktywną rezerwację → bilety dalej widoczne (regresja).
3. Panel admina → karta usuniętych kont → historyczne wpisy Romanka pozostają widoczne z oznaczeniem „konto usunięte".
