## Plan naprawy

1. **Ustabilizować odczyt biletów użytkownika przy karcie wydarzenia**
   - Zmieniam komponent `MyEventTicketsInline`, żeby nie pokazywał komunikatu „Nie jesteś jeszcze zarejestrowany” zanim auth/profil użytkownika są gotowe.
   - Zapytanie o bilety uruchomi się dopiero po pełnym przygotowaniu kontekstu logowania (`rolesReady`) i będzie używało także emaila z sesji/profilu.

2. **Naprawić dopasowanie biletów do zalogowanego partnera**
   - Rozszerzam logikę wyszukiwania zamówień tak, aby bilet był znaleziony po `user_id` albo po emailu bez względu na wielkość liter.
   - Dzięki temu zamówienia utworzone jako zalogowany użytkownik i starsze zamówienia powiązane tylko emailem pokażą się pod właściwym wydarzeniem.

3. **Dodać awaryjny odczyt konkretnego biletu przez backend, jeśli RLS/relacje klienta ukryją dane**
   - Jeśli bezpośrednie zapytanie z frontendu nie zwróci biletu mimo zalogowanego użytkownika, komponent spróbuje pobrać poprawne zamówienia przez bezpieczną ścieżkę serwerową/Supabase RPC albo edge-function z tokenem użytkownika.
   - Wynik pozostanie ograniczony tylko do aktualnie zalogowanego użytkownika i danego wydarzenia.

4. **Ujednolicić odświeżanie po rezerwacji**
   - Po rezerwacji bezpłatnego i płatnego miejsca odświeżę wszystkie klucze zapytań używane przez kartę wydarzenia, aby bilet pojawiał się od razu bez ręcznego przeładowania strony.

5. **Weryfikacja**
   - Sprawdzę w bazie istniejący rekord dla wydarzenia „Kompleksowe szkolenie TEST” i upewnię się, że UI dla zalogowanego użytkownika nie ma już prawa wyświetlić „0 biletów”, gdy istnieje aktywne zamówienie `paid/confirmed/pending/awaiting_email_confirmation/awaiting_transfer`.