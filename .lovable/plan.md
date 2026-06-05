## Plan naprawy

Wdrożę upload wideo tak, żeby każdy plik wideo w News Hub szedł wyłącznie przez endpoint Node/Express z `multer`, bez próby zapisu do Supabase Storage i bez limitu bucketu `training-media`.

## Zakres zmian

1. **Tylko multer dla wideo**
   - Każde `video/*` oraz pliki `.mp4`, `.mov`, `.webm`, `.m4v`, `.avi`, `.mkv` będą zawsze wysyłane na `/upload` obsługiwany przez `multer`.
   - Dla wideo usunę jakikolwiek fallback do Supabase Storage.
   - Dla News Hub wymuszę jeden folder docelowy: `training-media`.

2. **Poprawa backendu uploadu w `server.js`**
   - Dopilnuję, żeby `multer` zapisywał duże pliki do `uploads/training-media` i zwracał sukces dopiero po potwierdzeniu, że plik istnieje na dysku i ma poprawny rozmiar.
   - Dodam bezpieczną walidację folderu, żeby upload nie mógł wyjść poza katalog `uploads`.
   - Dodam czytelne błędy dla limitu rozmiaru, typu MIME, braku miejsca/zapisu i pustego pliku.
   - Utrzymam limit aplikacyjny 2 GB po stronie multer.

3. **Sprawne odtwarzanie dla każdego użytkownika**
   - Serwer będzie serwował pliki wideo przez `/uploads/training-media/...` z obsługą `Range`, `206 Partial Content`, `Accept-Ranges`, `Content-Length` i właściwym `Content-Type`.
   - To zapewni przewijanie, ładowanie metadanych i odtwarzanie MP4 w przeglądarkach.
   - Dla MP4 ustawię `video/mp4`, dla WebM `video/webm`, dla MOV bezpieczny typ odtwarzania.

4. **Weryfikacja po uploadzie**
   - Po zakończeniu uploadu klient wykona `GET` z `Range: bytes=0-0` na zwrócony URL.
   - Jeżeli serwer zwróci `404`, HTML, pustą odpowiedź albo nieprawidłowy `content-type`, aplikacja nie zapisze URL-a w poście.
   - Sukces będzie oznaczał realnie zapisany i publicznie odtwarzalny plik.

5. **News Hub edytor i bloki wideo**
   - Upload głównego wideo posta oraz bloku wideo będzie używał tej samej ścieżki multer.
   - Nie będzie już sytuacji, w której wideo trafia do folderu `files` albo do bucketu Supabase.
   - Komunikaty w edytorze będą pokazywać dokładny błąd zamiast ogólnego „Błąd uploadu”.

6. **Odtwarzacze**
   - Ujednolicę obsługę błędów w widoku posta, modalu i blokach treści.
   - Jeśli ktoś trafi na stary/błędny URL, zamiast `0:00` pokaże się jasny komunikat, że plik nie jest dostępny.

## Ważne technicznie

`multer` działa po stronie serwera Node/Express. W tym projekcie tym serwerem jest `server.js`, a pliki są publicznie serwowane z `/uploads`. Nie będę używał Supabase Storage dla wideo.

Jeżeli po tej zmianie upload nadal zwróci błąd dla 142 MB, przyczyną będzie konfiguracja serwera przed Node, np. nginx/hosting blokujący request przed dojściem do `multer`. Kod aplikacji wtedy pokaże prawdziwy błąd zamiast zapisać fałszywy link.