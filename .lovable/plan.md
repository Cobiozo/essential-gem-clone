Plan naprawy:

1. **Wymienię walidację tokenu w `supabase/functions/_shared/admin-auth.ts` na odporną funkcję pomocniczą**
   - Najpierw spróbuje standardowego `getClaims()`.
   - Jeśli Supabase zwróci błąd sesji / `Invalid token`, funkcja przejdzie na bezpieczny fallback lokalny:
     - zweryfikuje podpis JWT przez `SUPABASE_JWT_SECRET` dla tokenów HS256, jeśli sekret jest dostępny,
     - albo przez JWKS Supabase dla tokenów RS/ES, jeśli token używa nowych signing keys,
     - sprawdzi `exp`, `sub`, `iss` i poprawność formatu tokenu.
   - Dzięki temu funkcja nie będzie zależna od aktywnego rekordu sesji GoTrue, który obecnie powoduje 401 mimo zalogowanego admina.

2. **Dodam bezpieczne logi diagnostyczne bez ujawniania tokenów**
   - Logi pokażą tylko metodę walidacji i typ błędu (`getClaims`, `hs256`, `jwks`, `expired`, `missing_sub`), bez prywatnych danych.
   - To pozwoli odróżnić realnie wygasły token od błędu `session_not_found`.

3. **Zostawię autoryzację admina po stronie serwera**
   - Po wyciągnięciu `userId` z poprawnego JWT nadal będzie sprawdzana rola `admin` w `user_roles` przez service role.
   - Nie będę przenosił uprawnień admina do frontendu ani localStorage.

4. **Poprawię obsługę błędu w panelu moderatorów tylko minimalnie**
   - Jeśli token faktycznie jest wygasły, komunikat będzie mówił o konieczności ponownego zalogowania, a nie tylko „Invalid token”.
   - Sam zapis uprawnień nadal będzie szedł przez `admin-set-moderator`.

5. **Wdrożę i sprawdzę funkcję `admin-set-moderator`**
   - Po zmianie wdrożę Edge Function.
   - Sprawdzę logi i wykonanie endpointu, żeby potwierdzić, że zapis uprawnień nie kończy się 401 „Invalid token”.

Efekt końcowy: administrator będzie mógł przełączać opcje dostępu moderatora, a przypisane moduły będą zapisywać się bez błędu „Invalid token”.