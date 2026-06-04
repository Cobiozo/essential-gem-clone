Zdiagnozowałem problem: zapisany URL wideo wygląda jak MP4, ale serwer zwraca pod nim HTML aplikacji (`content-type: text/html`, rozmiar ok. 7 KB), więc odtwarzacz pokazuje 0:00. To oznacza, że upload zwrócił link, którego nie da się odtworzyć jako wideo albo plik nie trafił pod tę ścieżkę.

Plan naprawy:

1. Ujednolicić upload News Hub z działającym mechanizmem VPS
- W `useNewsHub.ts` użyć wspólnej konfiguracji `STORAGE_CONFIG.UPLOAD_API_URL` zamiast wpisanego na sztywno `/upload`.
- Dla News Hub wysyłać duże pliki do folderów VPS zgodnych z tym, co serwer faktycznie obsługuje.
- Walidować odpowiedź uploadu: po otrzymaniu URL sprawdzić nagłówki pliku i odrzucić link, jeśli nie jest prawdziwym wideo/obrazem/plikiem, tylko HTML aplikacji.

2. Naprawić wybór folderu dla bloków wideo
- W `BlockListEditor.tsx` blok `video` obecnie wysyła przez folder `files`, co widać na screenie (`/news-hub/files/...`). Zmieniam to na folder wideo/media.
- Dodać pasek postępu i czytelny komunikat błędu także w edytorze bloków, nie tylko w formularzu posta.

3. Poprawić renderowanie wideo w Aktualnościach
- W `PostContent.tsx`, `BlockRenderer.tsx` i `PostDetailModal.tsx` dodać wspólny odtwarzacz, który pokazuje zrozumiały komunikat, jeśli URL nie jest odtwarzalnym plikiem MP4.
- Dodać `preload="metadata"`, `playsInline` i obsługę `onError`, żeby błąd nie wyglądał jak puste wideo 0:00.

4. Zabezpieczyć przed zapisem błędnego URL
- Po uploadzie MP4 sprawdzić, czy serwer zwraca typ `video/*` albo poprawny strumień z obsługą range requests.
- Jeśli serwer zwróci HTML lub nieprawidłowy typ, aplikacja pokaże błąd: plik został wysłany pod nieobsługiwaną ścieżkę / konfiguracja VPS wymaga poprawy.

5. Co z już dodanym postem
- Obecny rekord w bazie ma URL, który nie wskazuje na prawdziwe MP4. Po wdrożeniu poprawki trzeba będzie wgrać to wideo ponownie, bo aktualny link prowadzi do HTML aplikacji, a nie do nagrania.

Nie będę zmieniał bazy danych ani RLS — to problem uploadu/ścieżki/renderowania, nie struktury danych.