## Cel
Naprawić dodawanie plików MP4 do lekcji w Akademii, które obecnie kończy się błędem: „Nie można zweryfikować wgranego pliku wideo (brak dostępu do serwera plików)”.

## Co ustaliłem
- Upload MP4 idzie przez endpoint `/upload` w `server.js`, a nie przez Supabase Storage.
- Po uploadzie frontend natychmiast weryfikuje zwrócony URL przez `fetch(..., { Range: 'bytes=0-0' })`.
- Serwer zwraca pełny URL produkcyjny `https://purelifecenter.pl/uploads/...`, więc w podglądzie/Lovable albo przy świeżym pliku weryfikacja może sprawdzać nie ten host albo host, który jeszcze nie widzi pliku.
- Błąd widoczny na screenie pochodzi właśnie z tej weryfikacji po stronie frontendu, nie z samego wyboru pliku.

## Plan naprawy
1. **Uodpornić zwracanie URL po uploadzie**
   - W `server.js` zwracać dodatkowo `relativePath` i nadal zostawić `url` dla kompatybilności.
   - Po stronie frontendu preferować lokalny `relativePath` (`/uploads/training-media/...`) do natychmiastowej weryfikacji i zapisu w lekcji, zamiast sztywnego pełnego URL produkcyjnego.

2. **Naprawić weryfikację wideo po uploadzie**
   - W `useLocalStorage.ts` sprawdzać najpierw lokalny/relatywny URL.
   - Dodać krótkie retry weryfikacji, bo plik może być zapisany, ale serwer/streaming może odpowiedzieć chwilę później.
   - Nie kończyć procesu błędem tylko dlatego, że `Range fetch` chwilowo nie przeszedł, jeśli endpoint uploadu zwrócił `success: true`, `verified: true` i poprawną ścieżkę.

3. **Poprawić komunikat dla admina**
   - W `MediaUpload.tsx` rozróżnić realny błąd uploadu od opóźnionej weryfikacji.
   - Jeśli upload się udał, ale weryfikacja streamingu wymaga chwili, pokazać komunikat typu „Plik został zapisany, trwa sprawdzanie dostępności odtwarzania”, zamiast czerwonego błędu blokującego dodanie lekcji.

4. **Zachować optymalizację pod iPhone**
   - Nie usuwać obecnego mechanizmu konwersji do MP4 H.264 + AAC.
   - Dopilnować, aby po konwersji zwracana nazwa/URL wskazywały na finalny plik `*-ios-h264.mp4`.

5. **Walidacja po wdrożeniu**
   - Sprawdzić, że po uploadzie MP4 komponent wywołuje `onMediaUploaded(...)` i lekcja dostaje URL pliku.
   - Sprawdzić, że pasek dochodzi do końca i pokazuje stan zakończenia zamiast błędu „brak dostępu do serwera plików”.
   - Sprawdzić typecheck/lint w zakresie zmienionych plików, jeśli środowisko pozwoli.