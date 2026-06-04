## Problem

Po przełączeniu uprawnienia w panelu moderatorów wyskakuje "Invalid token". Edge function `admin-set-moderator` odrzuca request w `verifyAdmin()`.

## Przyczyna

W logach auth (`/auth/v1/user`) widać powtarzające się odpowiedzi 403 z błędem:
```
"session id (d676ccf2-...) doesn't exist"
```

`supabase/functions/_shared/admin-auth.ts` weryfikuje token wołając `userClient.auth.getUser()`, które uderza do serwera GoTrue i sprawdza, czy **sesja** dla danego JWT nadal istnieje. Przy nowym systemie kluczy podpisujących Supabase (oraz po odświeżeniach/wielu kartach) sesja po stronie serwera potrafi zniknąć, mimo że JWT w localStorage zalogowanego admina jest wciąż kryptograficznie ważny. Skutek: `getUser()` zwraca błąd → funkcja oddaje 401 `Invalid token`, mimo że to ten sam zalogowany admin który właśnie wszedł do panelu.

To samo wytłumaczenie pasuje do faktu, że odczyty z tabel działają (idą przez PostgREST z anon-key + JWT i RLS, bez sprawdzania sesji), a tylko wywołania edge funkcji `admin-*` padają.

## Rozwiązanie

Zmienić weryfikację tożsamości w `_shared/admin-auth.ts` z `getUser()` (server session check) na **lokalną walidację JWT** przy pomocy `auth.getClaims(token)`, zgodnie z aktualnym standardem dla projektów z signing keys (patrz dyrektywa `disable-jwt-edge-functions` w systemie). Sprawdzenie roli admina dalej idzie przez `supabaseAdmin` (service role) na `user_roles`.

### Zmiany

**`supabase/functions/_shared/admin-auth.ts`** — w obu helperach (`verifyAdmin`, `verifyTicketVerifier`):

1. Wyciągnąć surowy token: `const token = authHeader.replace('Bearer ', '')`.
2. Zamiast tworzyć `userClient` i wołać `auth.getUser()`, użyć `supabaseAdmin.auth.getClaims(token)` (service-role client nadaje się do walidacji claims — nie wymaga sesji).
3. `userId = data.claims.sub`.
4. W razie błędu / braku `claims` — dalej zwracać 401 `Invalid token` z CORS.
5. Reszta logiki (sprawdzenie roli `admin` w `user_roles`, fallbacki ticket-verifiera) bez zmian.

Dzięki temu:
- Nie ma już zapytania `GET /auth/v1/user`, więc znika zależność od istnienia rekordu sesji.
- JWT jest walidowane lokalnie kluczem publicznym (asymetryczne signing keys), co jest szybsze i odporne na rotację sesji.
- Wszystkie funkcje używające `verifyAdmin` (m.in. `admin-set-moderator`, plus pozostali konsumenci helpera) zyskują poprawkę bez dotykania ich kodu.

### Brak innych zmian

- Nie ruszam frontu (`ModeratorsManagement.tsx`) — wywołanie `supabase.functions.invoke('admin-set-moderator', ...)` jest poprawne, automatycznie dokleja aktualny JWT.
- Nie ruszam migracji ani RLS — problem jest wyłącznie w warstwie auth edge funkcji.
- Nie zmieniam `config.toml` / `verify_jwt` — walidacja zostaje w kodzie.

## Test po wdrożeniu

1. Zalogowany admin wchodzi w `/admin?tab=moderators`.
2. Przełącza checkbox uprawnienia dla wybranego moderatora.
3. Spodziewane: toast "Zapisano uprawnienia", brak "Invalid token", w logach `admin-set-moderator` widać 200.
