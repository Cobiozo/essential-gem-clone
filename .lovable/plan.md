
## Diagnoza (dwa nakładające się problemy)

Sprawdziłem logi edge function i bazę:

**Problem 1 — rejestracja faktycznie nie przechodzi**
Trigger `prevent_role_escalation_trigger` na tabeli `profiles` blokuje każdy UPDATE, który zmienia kolumnę `role`, jeśli wywołujący nie jest adminem (`is_admin()` zwraca false dla service_role z edge function, bo `auth.uid()` jest NULL). Dodatkowo wartość `'guest'` nie jest na liście dozwolonych ról w tym triggerze (`user, client, admin, partner, specjalista`).

Ścieżka:
1. `admin.auth.admin.createUser(...)` → trigger `handle_new_user` tworzy wiersz w `profiles` (bez `role`) i wpis w `user_roles` z rolą `client`.
2. Edge function robi `upsert` na `profiles` z `role: 'guest'` → trigger `prevent_role_escalation` rzuca: `Access denied: Only administrators can modify user roles` (potwierdzone w logach: `profile upsert failed { code: "P0001", message: "Access denied..." }`).
3. Edge function kasuje usera, zwraca `profile_upsert_failed`.

Rola `guest` i tak żyje wyłącznie w tabeli `user_roles` (przypisywana przez RPC `consume_guest_invite`). Kolumna `profiles.role` jest tu zbędna.

**Problem 2 — komunikat jest mylący**
Na drugiej próbie (`byk1023@wp.pl`) baza pokazuje, że ten e-mail już istnieje jako partner (`role=partner`). Auth zwraca `email_exists` i edge function poprawnie odsyła `{ code: "email_exists", message: "Konto z tym adresem e-mail już istnieje..." }`. Ale frontend tego nie pokazuje — pojawia się generyczne „Rejestracja nieudana. Spróbuj ponownie lub skontaktuj się z administratorem.".

Przyczyna: w supabase-js v2 `FunctionsHttpError.context` jest bezpośrednio obiektem `Response`. Obecny kod czyta `error.context.response.clone().json()` — `error.context.response` jest `undefined`, więc parsowanie pada cicho i pokazuje fallback.

## Zmiany

### 1. `supabase/functions/guest-redeem-invite/index.ts`
- Usunąć `role: 'guest'` z payloadu `admin.from('profiles').upsert(...)` — rola gościa jest nadawana wyłącznie przez `consume_guest_invite` w `user_roles`.
- Zostawić resztę pól (`is_active`, `profile_completed`, `guardian_approved`, zgody itd.) bez zmian.
- Dorzucić jasne logowanie kodu błędu na końcu (debug).

### 2. `src/pages/GuestRegister.tsx`
- Naprawić parsowanie błędu z edge function — sprawdzać kolejno:
  1. `error.context` jako `Response` (`typeof error.context?.json === 'function'`)
  2. `error.context.response` (stary kształt, na wszelki wypadek)
  3. `data?.error` (gdy serwer zwrócił 200 z polem error)
- Po sparsowaniu pokazywać `TITLES[code]` + `message` z serwera. Dla `email_exists` dodatkowo przycisk „Przejdź do logowania" pod toastem (CTA w opisie).
- Rozszerzyć słownik tytułów o `unknown` i nigdy nie pokazywać generycznego komunikatu, jeśli serwer przysłał `message`.

### 3. Weryfikacja
Po wdrożeniu sprawdzić edge function logs dla `guest-redeem-invite` — nie powinno być już `profile upsert failed`. Test ręczny:
- nowy e-mail → konto utworzone, mail aktywacyjny wysłany,
- e-mail istniejący (np. `byk1023@wp.pl`) → czytelny komunikat „Konto z tym adresem e-mail już istnieje…".

Nie ruszam triggera `prevent_role_escalation` ani schematu bazy — fix jest po stronie kodu, więc nie wymaga migracji ani aprobaty SQL.
