Plan naprawy błędu 404 po uploadzie MP4:

1. Naprawię główną przyczynę w `server.js`:
   - `multer` nie będzie już zapisywał pliku bezpośrednio do folderu z `req.body.folder`, bo przy multipart kolejność pól nie jest gwarantowana.
   - Upload trafi najpierw do bezpiecznego folderu tymczasowego, a dopiero po zakończeniu parsowania formularza serwer przeniesie plik do docelowego folderu, np. `uploads/training-media/`.
   - Dzięki temu URL `/uploads/training-media/...` będzie zawsze wskazywał na faktyczny plik na dysku.

2. Dodam odporność na już uszkodzone uploady:
   - Handler `/uploads/training-media/:filename` sprawdzi najpierw `uploads/training-media/<plik>`.
   - Jeśli plik istnieje przez wcześniejszy błąd w `uploads/<plik>`, serwer automatycznie obsłuży go z tej lokalizacji albo przeniesie do `training-media`.
   - To naprawi przypadki, gdzie baza ma URL z `training-media`, ale plik fizycznie wylądował w katalogu głównym `uploads`.

3. Ujednolicę klienta na „tylko multer” dla wideo:
   - W `useNewsHub.ts` zostanie wyłącznie upload przez `/upload` dla każdego wideo.
   - Pole `folder` będzie wysyłane przed `file`, ale backend i tak będzie niezależny od kolejności.
   - Komunikaty użytkownika nie będą mówiły o „VPS”, tylko o serwerze uploadu/multer.

4. Ujednolicę `useLocalStorage.ts`:
   - Wideo nadal zawsze pójdzie przez `/upload`.
   - Komunikaty błędów i timeout zostaną dopasowane do dużych plików, bez tekstów sugerujących Supabase/VPS jako ścieżkę dla wideo.

5. Weryfikacja po uploadzie zostanie zachowana, ale z poprawnym celem:
   - Klient sprawdzi `GET Range: bytes=0-0`.
   - Jeśli serwer zwróci 200/206 i typ wideo, URL zostanie zapisany.
   - Jeśli serwer zwróci HTML/404, zapis zostanie zablokowany z jasnym komunikatem.

Efekt: duże MP4 będą zapisywane przez multer na dysku produkcyjnym, URL będzie od razu odtwarzalny dla użytkowników, a stare błędne ścieżki przestaną zwracać 404 tam, gdzie plik faktycznie istnieje w `uploads`.