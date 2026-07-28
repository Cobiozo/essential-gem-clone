## Plan naprawy resetu hasła

Potwierdzone z audytu:
- Ostatni mail resetujący jest już generowany dla `https://purelifecenter.pl` i zawiera `token_hash` w metadanych wysyłki.
- Problem widoczny na screenie jest po stronie obsługi linku na `/reset-password`: strona wymaga `type=recovery`, a link na screenie ma tylko `token_hash`, więc aplikacja od razu pokazuje „Nieprawidłowy link”.
- Trzeba uszczelnić frontend tak, żeby każdy poprawny link z `token_hash` prowadził do formularza nowego hasła, również gdy parametr `type` nie występuje.

## Co zrobię

1. **Poprawię stronę `/reset-password`**
   - Będzie akceptować linki z samym `token_hash` jako reset hasła.
   - Jeśli `type` jest pusty, aplikacja użyje domyślnie `recovery`.
   - Obsłuży też częsty wariant Supabase, gdy parametry są w `#hash`, a nie w query stringu.
   - Usunie z URL token dopiero po udanej weryfikacji albo po zapisaniu konkretnego błędu, żeby nie tracić możliwości diagnozy.

2. **Dodam odporniejszą weryfikację sesji recovery**
   - Po `verifyOtp` aplikacja sprawdzi, czy faktycznie powstała sesja umożliwiająca `updateUser`.
   - Formularz ustawiania hasła pokaże się tylko po realnym potwierdzeniu sesji resetu.
   - Błąd będzie konkretny: wygasły link, wykorzystany link, błędny token albo brak sesji resetowania.

3. **Wzmocnię funkcję wysyłającą mail resetu**
   - Link w mailu będzie generowany jednoznacznie jako:  
     `https://purelifecenter.pl/reset-password?token_hash=...&type=recovery`
   - Dodam do metadanych logu skrócony format diagnostyczny bez ujawniania tokenu: domena, ścieżka, obecność `token_hash`, obecność `type=recovery`.
   - Sprawdzę, czy szablon używa wyłącznie `{{link_resetowania}}`, bez starego `action_link`.

4. **Zweryfikuję przepływ po zmianie hasła**
   - Po ustawieniu nowego hasła nadal zostanie wysłane powiadomienie o zmianie hasła z adresem `support@purelifecenter.pl`.
   - Następnie użytkownik zostanie wylogowany i przekierowany do logowania.

5. **Test końcowy**
   - Sprawdzę lokalnie warianty URL:
     - `/reset-password?token_hash=TEST&type=recovery`
     - `/reset-password?token_hash=TEST`
     - `/reset-password#token_hash=TEST&type=recovery`
   - Po wdrożeniu funkcji wyślę testowe wywołanie edge function i sprawdzę logi, czy nowy mail zawiera poprawny format linku.

## Efekt

Użytkownik klikający świeżo wygenerowany link z maila ma trafić bezpośrednio na formularz „Ustaw nowe hasło”, ustawić hasło, otrzymać powiadomienie e-mail o zmianie i wrócić do logowania.