Plan naprawy rejestracji gościa:

1. Naprawić błąd bazy danych blokujący rolę `guest`
   - Obecny błąd z logów: `profiles violates check constraint "valid_role_values"`.
   - Constraint `valid_role_values` w tabeli `profiles` dopuszcza tylko: `user`, `client`, `admin`, `partner`, `specjalista`.
   - Dodam `guest` do dozwolonych wartości albo zmienię synchronizację roli tak, żeby `guest` nie łamał legacy pola `profiles.role`.

2. Poprawić synchronizację ról
   - Funkcja `sync_profile_role_from_user_roles()` aktualnie pomija tylko `moderator`, ale próbuje przepisać `guest` do `profiles.role`.
   - Zaktualizuję ją tak, żeby rola `guest` była obsłużona bez błędu i nadal pozwalała wykrywać gościa przez `user_roles`.

3. Utwardzić Edge Function `guest-redeem-invite`
   - Po nieudanym utworzeniu profilu funkcja teraz kontynuuje, co kończy się kolejnym błędem przy konsumowaniu tokenu.
   - Zmienimy to tak, aby przy błędzie profilu funkcja zwracała czytelny błąd i sprzątała utworzone konto, zamiast pozostawiać pół-utworzone rekordy.

4. Zweryfikować przepływ po naprawie
   - Sprawdzę logi funkcji `guest-redeem-invite` po wdrożeniu.
   - Przetestuję wywołanie Edge Function na poprawnym tokenie lub wskażę, jeśli potrzebny będzie świeży link testowy z panelu admina.

Efekt: gość będzie mógł utworzyć konto, zalogować się i wejść do dashboardu z dostępem ograniczonym przez konfigurację widoczności gościa.