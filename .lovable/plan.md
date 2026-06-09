## Diagnoza

Rejestracja nie działa, bo funkcja Edge `guest-redeem-invite` istnieje w repozytorium, ale nie jest dostępna w Supabase: test zwraca `404 Requested function was not found`, a logi funkcji są puste. To oznacza, że żądanie z formularza nie dochodzi do kodu rejestracji.

Dodatkowo z planu zostały wdrożone tylko części:
- baza danych dla linków i widoczności istnieje,
- route `/zaproszenie/:token` istnieje,
- panel `Goście` i link zaproszenia istnieją,
- widoczność jest częściowo podpięta tylko w górnym pasku,
- brakuje realnego, bezpiecznego ograniczenia pulpitu i menu bocznego dla gościa,
- gość po rejestracji mógłby zostać zablokowany przez standardowy guard akceptacji/profilu, bo profil gościa nie jest oznaczany jako zatwierdzony i kompletny.

## Plan naprawy

1. **Uruchomić funkcję rejestracji gościa**
   - Dodać `guest-redeem-invite` do konfiguracji Supabase z publicznym wywołaniem.
   - Uporządkować CORS i walidację odpowiedzi, żeby formularz zawsze dostawał czytelny błąd zamiast ogólnego „Failed to send a request”.
   - Po zmianie przetestować funkcję bezpośrednio na niepoprawnym tokenie — oczekiwany wynik: odpowiedź funkcji, nie 404.

2. **Poprawić tworzenie profilu gościa**
   - Podczas rejestracji zapisywać profil jako aktywny, zatwierdzony i kompletny dla roli `guest`.
   - Zapisać akceptacje: regulamin, prywatność, RODO oraz datę akceptacji.
   - Dzięki temu gość po pierwszym logowaniu trafi na `/dashboard`, a nie na ekran oczekiwania na akceptację lub uzupełnienie profilu.

3. **Pominąć MFA i standardowy approval guard dla gościa**
   - W `AuthContext` dodać jawne rozpoznanie `isGuest`.
   - Nie uruchamiać wymogu MFA dla roli `guest`.
   - W `ProfileCompletionGuard` pozwolić gościowi wejść do aplikacji po poprawnej rejestracji bez procesu Guardian/Admin approval.

4. **Podpiąć widoczność gościa do realnego pulpitu**
   - W `DashboardSidebar` filtrować pozycje menu przez `useGuestVisibility()`.
   - Dla gościa zostawić tylko neutralne moduły dopuszczone w konfiguracji, np. pulpit, aktualności, baza wiedzy, wybrane strony HTML, profil/wsparcie.
   - Twardo ukryć moduły niedozwolone: CRM/kontakty, PureLinki, akademia partnerska, spotkania partnerskie, kalkulatory, panel lidera, czat, admin, partner page, PureBox.

5. **Podpiąć widoczność gościa do widgetów pulpitu i banerów**
   - W `Dashboard.tsx` renderować tylko te widgety, które admin dopuścił w konfiguracji gościa.
   - Nie ładować widgetów, które mogą odpalać zapytania partnerskie lub czatowe.
   - W `DashboardLayout` ukrywać `AppBanners`, docked/floating chat i inne globalne elementy, jeśli widoczność gościa ich nie dopuszcza.

6. **Usprawnić panel admina Goście**
   - Dodać brakującą etykietę „Goście” w menu admina, żeby zakładka nie była pusta/nieczytelna.
   - Dodać obsługę błędów zapisu/odczytu w panelu, żeby admin od razu widział, jeśli RLS lub funkcja zwróci problem.
   - Poprawić listę gości, żeby pobierała profile po właściwym identyfikatorze użytkownika.

7. **Zweryfikować cały przepływ**
   - Sprawdzić istniejący link `GOŚĆ 1`.
   - Wywołać funkcję testowo.
   - Potwierdzić, że po rejestracji użytkownik dostaje rolę `guest`, profil jest aktywny/kompletny, a dashboard renderuje tylko przydzielone elementy.

## Efekt końcowy

Gość będzie mógł zarejestrować się przez link admina, zalogować bez MFA i korzystać z pulpitu ograniczonego do elementów przydzielonych przez admina globalnie lub indywidualnie.