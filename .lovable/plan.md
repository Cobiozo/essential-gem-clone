## Cel
Naprawić błąd „Invalid token (jwt_secret_missing)" w panelu Weryfikacji biletów (i wszystkich innych funkcjach admin/ticket-verifier korzystających ze wspólnego `_shared/admin-auth.ts`).

## Diagnoza
`supabase/functions/_shared/admin-auth.ts` weryfikuje JWT w dwóch krokach:
1. `auth.getClaims(token)` — obecnie zwraca błąd (nowe wersje klienta wymagają JWKS/asymmetric keys, których projekt jeszcze nie ma skonfigurowanych).
2. Fallback lokalny: jeśli token jest HS256, potrzebuje `SUPABASE_JWT_SECRET`. Ten sekret nie jest ustawiony w projekcie → funkcja zwraca 401 `jwt_secret_missing`.

Efekt: **każda** funkcja używająca `verifyAdmin` / `verifyTicketVerifier` (m.in. `admin-list-event-orders`, `verify-event-ticket`, `admin-*`) odrzuca żądania.

## Zmiana

### 1. `supabase/functions/_shared/admin-auth.ts`
Dodać jako pierwszy, niezawodny mechanizm weryfikacji: `supabaseAdmin.auth.getUser(token)` przez klienta service-role. Auth API waliduje podpis po stronie serwera bez potrzeby posiadania `JWT_SECRET` ani JWKS w edge function.

Nowa kolejność w `verifyJwtClaims`:
1. **`supabaseAdmin.auth.getUser(token)`** — jeśli zwróci usera → sukces (`method: "getUser"`), zwracamy `sub = user.id` + `exp` z payloadu.
2. Dotychczasowy `getClaims` (dla nowych projektów z asymmetric JWT) — bez zmian.
3. Dotychczasowy fallback HS256/JWKS — bez zmian (przydatny gdy Auth API jest offline).

Dzięki temu:
- działa dla obecnego (HS256, legacy) tokena bez sekretu,
- działa dla nowych projektów z JWKS,
- brak nowej powierzchni ataku (Auth API weryfikuje JWT tak samo jak PostgREST).

### 2. Refactor sygnatur
`verifyJwtClaims` dostaje dodatkowy parametr `supabaseAdmin: SupabaseClient` (klient service-role już tworzony w `verifyAdmin`/`verifyTicketVerifier`). Przenieść tworzenie klienta powyżej wywołania `verifyJwtClaims`.

## Weryfikacja
- Po deployu: w panelu `/weryfikacja-biletow` wybrać wydarzenie — lista uczestników ładuje się bez błędu.
- Logi `admin-list-event-orders` mają `[verifyTicketVerifier] JWT verified { method: "getUser" }`.
- Test regresji: dowolna funkcja admin (np. `admin-list-event-orders` z konta admina i konta bez roli) — 200 vs 403, żadne 401 `jwt_secret_missing`.

## Poza zakresem
- Brak zmian w RLS, tabelach, konfiguracji Supabase Auth.
- Nie dodajemy sekretu `SUPABASE_JWT_SECRET` — rozwiązanie działa bez niego i nie wymaga akcji użytkownika.
