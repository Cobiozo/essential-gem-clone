## Problem 1 — „Weryfikator" widzi `Forbidden: admin role required`

**Co już działa:**
- W bazie: `has_ticket_verifier_access(60645dff-…)` zwraca `true` (rola admin + wpis `ticket_verifier_access.is_enabled=true`, granted 16:30:04).
- Kod źródłowy `supabase/functions/admin-list-event-orders/index.ts` importuje już `verifyTicketVerifier` jako `verifyAdmin`.
- Mimo to logi Edge Function pokazują `auth failed -> returning 403`, a UI dostaje literalnie komunikat „admin role required" — ten string istnieje **wyłącznie** w `verifyAdmin` (stara ścieżka). To oznacza, że uruchomiona wersja funkcji to jeszcze poprzedni bundle (zmiana w `_shared/admin-auth.ts` nie została wciągnięta do `admin-list-event-orders` / `verify-event-ticket`).

**Plan naprawy:**
1. Wymuszenie redeploya obu funkcji przez dotknięcie plików (komentarz „re-deploy"):
   - `supabase/functions/admin-list-event-orders/index.ts`
   - `supabase/functions/verify-event-ticket/index.ts`
2. Uodpornienie `verifyTicketVerifier` w `_shared/admin-auth.ts`:
   - jeśli RPC `has_ticket_verifier_access` zwróci `null`/błąd, dodatkowo sprawdzić bezpośrednio (service role): `user_roles.role='admin'` LUB `ticket_verifier_access.is_enabled=true`.
   - logować `userId` i wynik (`isAdmin`, `hasAccess`) przed zwrotem 403, żeby kolejne diagnozy były jednoznaczne.
3. Po redeployu komunikat 403 (jeśli się jeszcze pojawi) będzie brzmiał „ticket verifier access required" — łatwiej odróżnić rolę od dostępu.

Bez zmian: tabela `ticket_verifier_access`, RLS, funkcja SQL `has_ticket_verifier_access`, panel admina, sidebar.

## Problem 2 — Baner „uzupełnij dane adresowe" mruga na pulpicie

**Przyczyna (`src/components/banners/AppBanners.tsx`):**
- Banery z `audience_type='missing_profile_fields'` są filtrowane przez `matchBanner`, który dla `profile == null` traktuje **wszystkie** wymagane pola jako brakujące i zwraca `visible: true`.
- Query `app-banners-profile` startuje **po** tym jak załadują się banery (bo `enabled: enabled && needsProfile`). Przez ~200–500 ms `profile` jest `undefined`, więc baner mignie, a po pobraniu profilu znika.

**Plan naprawy (tylko frontend, `AppBanners.tsx`):**
1. Dodać do hooka stan `isLoading` z `useQuery` (profile + banners).
2. W filtrze `visible` pominąć banery `missing_profile_fields`, dopóki `profile === undefined` (jeszcze nieładowane) lub `profileLoading === true`.
3. Wczesny `return null`, gdy baner z `missing_profile_fields` istnieje, a profil nie został jeszcze pobrany — to eliminuje flash bez wpływu na inne typy banerów.

Bez zmian: logika `matchBanner`, definicje banerów w bazie, redirect po uzupełnieniu profilu.

## Pliki do edycji
- `supabase/functions/_shared/admin-auth.ts` — hardening `verifyTicketVerifier` + log.
- `supabase/functions/admin-list-event-orders/index.ts` — touch (re-deploy).
- `supabase/functions/verify-event-ticket/index.ts` — touch (re-deploy).
- `src/components/banners/AppBanners.tsx` — anty-flash dla banerów profilowych.
