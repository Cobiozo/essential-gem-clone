Plan naprawy resetowania hasła:

1. Uporządkuję generowanie linku resetu w `send-password-reset`:
   - link w mailu będzie zawsze budowany jako `https://purelifecenter.pl/reset-password?token_hash=...&type=recovery`, bez fallbacku do `action_link`, który może prowadzić do błędnego `localhost:3000`;
   - funkcja przerwie wysyłkę, jeśli Supabase nie zwróci `hashed_token`, zamiast wysłać potencjalnie błędny link;
   - dodam bezpieczną normalizację domeny, aby baza nie mogła przypadkowo wymusić `localhost`, pustego adresu lub adresu bez `https`.

2. Poprawię treść maila resetującego w bazie:
   - usunę stare odwołania do `purelife.info.pl`;
   - dodam widoczny tekstowy link awaryjny pod przyciskiem, żeby użytkownik mógł skopiować pełny URL z `token_hash`;
   - dopiszę jasną instrukcję, że link prowadzi do ustawienia nowego hasła oraz kontakt `support@purelifecenter.pl`.

3. Wzmocnię stronę `/reset-password`:
   - po wejściu z `token_hash` strona ma jednoznacznie zweryfikować token i pokazać formularz nowego hasła;
   - jeśli link jest starym formatem z hashem Supabase, strona nadal obsłuży sesję odzyskiwania;
   - usunę ryzyko, że globalny AuthContext lub redirect po zalogowanej sesji przeszkodzi użytkownikowi w ustawieniu hasła.

4. Zweryfikuję mail potwierdzający zmianę hasła:
   - upewnię się, że po `updateUser` wywoływane jest powiadomienie o zmianie hasła;
   - treść powiadomienia będzie zawierała informację: jeśli to nie Ty zmieniłeś hasło, skontaktuj się z `support@purelifecenter.pl`.

5. Wdrożę funkcje edge i sprawdzę logi:
   - wdrożę `send-password-reset` oraz `send-password-changed-notification`;
   - sprawdzę, czy nowe wywołanie generuje `usedTokenHash: true` i bazowy URL `https://purelifecenter.pl`.

Technicznie: obecny kod już generuje `hashed_token`, ale nadal ma fallback do `action_link`; w bazie szablon resetu nadal zawiera stary adres supportu `support@purelife.info.pl`, więc oba elementy zostaną poprawione.