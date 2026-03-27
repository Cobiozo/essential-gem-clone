
## Plan: link auto-webinaru ma być przypisany do jednego konkretnego terminu i po czasie ma wygasać bez fallbacku

### Co jest teraz nie tak
W obecnym kodzie jedna funkcja (`getNextSlot`) miesza 2 różne zadania:
1. rozpoznanie konkretnego terminu z linku,
2. szukanie „najbliższego następnego slotu”.

Przez to link do 10:30 nie jest traktowany jako „10:30 albo nic”, tylko w niektórych ścieżkach może zostać przepięty na 11:00. To jest dokładnie zachowanie, którego nie chcesz.

### Co zmienię
1. Rozdzielę logikę na 2 osobne ścieżki w `src/pages/EventGuestRegistration.tsx`:
   - `resolveRequestedSlot(...)` — tylko do walidacji slotu z linku, bez żadnego przesuwania na kolejny termin
   - `getNextAvailableSlot(...)` — tylko do ogólnego wyliczania przyszłych terminów tam, gdzie naprawdę ma to sens

2. Dla auto-webinaru z parametrem `slot` w linku:
   - link będzie działał wyłącznie dla dokładnie tego terminu `YYYY-MM-DD_HH:MM`
   - jeśli termin minął → natychmiast komunikat „link stracił ważność”
   - jeśli termin nie istnieje w konfiguracji danego BO/HC → natychmiast komunikat „link nieprawidłowy”
   - żadnego przełączania na 11:00, jutro, kolejny slot itp.

3. Zaostrzę regułę dla starych linków:
   - stare `slot=HH:MM` nie będą już przekierowywane na kolejny dzień/godzinę
   - dla flow zaproszeń auto-webinarowych będą traktowane jako nieważne / niekompletne
   - to wymusi zasadę: każdy dzień i każda godzina mają własny, jednorazowo interpretowany link

4. Zmienię submit formularza w `EventGuestRegistration.tsx`:
   - zapis do `guest_event_registrations.slot_time`
   - treść maila
   - ekran sukcesu  
   będą korzystać wyłącznie z już zwalidowanego, konkretnego slotu z linku, a nie z ponownego liczenia „następnego dostępnego”

5. Dodam dodatkową blokadę wcześniej w `src/pages/EventRegistrationBySlug.tsx`:
   - dla auto-webinarów z `slot` sprawdzę, czy termin z linku jest jeszcze ważny
   - jeśli nie, użytkownik dostanie od razu ekran o wygaśnięciu linku zamiast wejścia na formularz rejestracji

### Czego nie ruszam
- zwykłe webinary tworzone przez admina — bez zmian
- niezależność BO i HC — bez zmian, zostaje pełna separacja
- przypisanie kontaktu do partnera zapraszającego — zostaje, `invited_by` nadal ma działać jak teraz

### Efekt po wdrożeniu
- link do `2026-03-27_10:30` przed 10:30 → działa tylko dla 10:30
- ten sam link po 10:30 → nieważny
- ten sam link nie pokaże już 11:00 ani jutra
- błędny slot albo slot spoza konfiguracji wydarzenia → nieważny
- partner nadal będzie poprawnie przypisany do rejestracji

### Pliki do modyfikacji
- `src/pages/EventGuestRegistration.tsx`
- `src/pages/EventRegistrationBySlug.tsx`

### Techniczne doprecyzowanie
Zamiast jednego helpera zwracającego „jakiś sensowny slot”, wprowadzę ścisły model:
- `missing` — brak slotu
- `invalid` — zły format albo termin nie należy do konfiguracji wydarzenia
- `expired` — termin z linku już minął
- `valid` — dokładnie ten termin wolno pokazać i zapisać

Dzięki temu flow rejestracji przestanie mieć jakikolwiek fallback do kolejnej godziny. Link będzie miał status binarny: aktywny albo martwy.
