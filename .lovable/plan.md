Plan naprawy skupi się na odtwarzaczu Akademii, bo problem ze screenów dotyczy `TrainingModule` i trybu pierwszego oglądania lekcji, a nie Bazy Wiedzy.

1. **Naprawić źródło wideo w trybie Akademii**
   - W gałęzi `SecureMedia` używanej przy niezakończonej lekcji (`disableInteraction=true`) zamienić bezpośrednie `src={signedUrl}` na `<source src={signedUrl} type={videoMime(signedUrl)} />`.
   - Dodać brakujące atrybuty iOS (`x-webkit-airplay`, pełne `playsInline`) oraz poprawne handlery `loadedmetadata`, `loadeddata`, `canplay`, `error`.
   - Dzięki temu Chrome na iPhone, który działa na silniku Safari/WebKit, nie będzie zgadywał typu pliku z błędnych nagłówków serwera.

2. **Uniezależnić licznik czasu od niestabilnego `timeupdate` na iOS**
   - Dodać lekki ticker oparty o `requestAnimationFrame` / interwał podczas odtwarzania, który będzie regularnie odczytywał `video.currentTime`.
   - Aktualizować `currentTime`, pasek postępu i `TrainingModule` także wtedy, gdy iOS przestaje wysyłać `timeupdate`.
   - To rozwiąże objaw: „nie odlicza minut nagrania”, mimo że dźwięk idzie dalej.

3. **Dodać watchdog na zawieszony obraz przy działającym dźwięku**
   - Wykorzystać `requestVideoFrameCallback`, jeśli jest dostępny, do monitorowania renderowanych klatek.
   - Jeśli `currentTime` rośnie, ale klatki nie są renderowane przez kilka sekund, wykonać miękkie odzyskanie: zapisać pozycję, przeładować pipeline wideo, wrócić do tej pozycji i wznowić po dotknięciu/automatycznie gdy przeglądarka pozwoli.
   - Ograniczyć agresywne `video.load()` podczas normalnego odtwarzania, bo na iOS potrafi powodować rozjazd audio/obrazu.

4. **Uspokoić buforowanie specjalnie dla iOS**
   - Zmienić logikę `waiting/stalled` tak, aby na iOS nie przełączała odtwarzacza zbyt często w stan „Ładowanie…”, gdy wideo faktycznie gra.
   - Nie chować obrazu, jeżeli metadane są załadowane i `currentTime` rośnie.
   - Przywracać `videoReady` już po `loadedmetadata/loadeddata`, a nie dopiero przy późniejszych zdarzeniach, które na iPhone bywają opóźnione.

5. **Poprawić restart/retry bez utraty pozycji**
   - Przycisk „Napraw” i automatyczna naprawa będą używać jednej ścieżki odzyskiwania: zachowaj czas, wyczyść flagi buforowania/seeking, odśwież element wideo i ustaw czas z powrotem.
   - Pozycja lekcji i blokada przewijania do przodu pozostaną zachowane.

6. **Dodać jasny fallback dla niekompatybilnego pliku**
   - Jeżeli Safari/WebKit zgłosi błąd dekodowania (`MEDIA_ERR_DECODE` / `SRC_NOT_SUPPORTED`), pokazać komunikat o wymaganym formacie: MP4 H.264 + AAC + FastStart.
   - To jest granica techniczna: jeśli konkretny plik jest zakodowany np. HEVC/H.265 lub serwer nie obsługuje poprawnie `Range`, frontend może tylko wykryć problem i pokazać instrukcję; nie da się „naprawić” takiego pliku samym Reactem.

7. **Walidacja po zmianie**
   - Sprawdzić kompilację/typecheck.
   - Przejrzeć odtwarzacz Akademii w widoku mobilnym i upewnić się, że kontrolki, czas, postęp i overlay ładowania zachowują się poprawnie.