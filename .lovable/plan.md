## Co się dzieje

- Ustawienie w bazie nadal jest poprawne: `default_mode = satellite`, więc mapa nie wraca przez konfigurację admina.
- Problem z „niestabilnością” wynika najpewniej z komponentu `UserWorldMap`: startowy kadr jest liczony dynamicznie z projekcji i resetowany przy zmianach stylu/projekcji. Po ostatnich zmianach trybu satelitarnego kadr Europy nie jest zapisany jako stały preset, tylko jako wyliczenie (`projection([15, 50])`, `zoom: 6.0`). To daje efekt, że wcześniejsze poprawki pozycjonowania „znikają”, bo nie są utrwalone jako jedna jawna konfiguracja widoku.
- Dodatkowo wybór trybu mapy zapisuje się w `localStorage`, co może mieszać się z ustawieniem admina i powodować wrażenie losowego zachowania między odświeżeniami / użytkownikami.
- Upload logo jest już odblokowany politykami storage, ale trzeba jeszcze uprościć ścieżkę uploadu i upewnić się, że oba sloty zapisują się deterministycznie.

## Plan naprawy

1. **Stały preset startowego kadru satelitarnego**
   - W `UserWorldMap.tsx` wydzielę jedną stałą konfigurację dla startowego widoku Europy w trybie satelitarnym.
   - Kadr będzie odpowiadał referencyjnemu screenowi: Europa w centrum, lekko bliżej i z korektą położenia/rolla przez stałe przesunięcie projekcji/kadru, zamiast przypadkowych obliczeń rozproszonych po komponencie.
   - Reset mapy i odznaczanie kraju będą wracały dokładnie do tego samego presetu.

2. **Rozdzielenie widoku satelitarnego i klasycznego**
   - Dla `satellite` i `classic` zastosuję osobne domyślne widoki, żeby zmiana trybu nie psuła startowego pozycjonowania.
   - Tryb satelitarny pozostanie domyślny z ustawień admina.

3. **Usunięcie konfliktu z `localStorage` dla widżetu dashboardu**
   - Jeżeli `initialMode` przychodzi z ustawień admina, komponent nie będzie nadpisywał go wcześniejszą lokalną preferencją użytkownika.
   - Przełącznik Klasyczna/Satelitarna nadal będzie działał w trakcie oglądania, ale start widżetu będzie determinowany przez ustawienia admina.

4. **Stabilizacja uploadu logo lewego i prawego**
   - Sprawdzę i dopracuję handler uploadu tak, żeby lewy i prawy slot używały tej samej logiki, unikalnej ścieżki i jednoznacznego zapisu URL.
   - Komunikat błędu zostanie konkretny: brak sesji, RLS/storage albo błąd zapisu ustawień.

5. **Weryfikacja**
   - Po wdrożeniu sprawdzę aktualny stan ustawień w bazie.
   - Zweryfikuję, że widget na `/dashboard` startuje w trybie satelitarnym i w tym samym kadrze co screen.
   - Sprawdzę, że reset mapy wraca do tego samego kadru.