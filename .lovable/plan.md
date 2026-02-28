
Cel: naprawić sytuację, w której po włączeniu efektu tła obraz tylko się „zmniejsza”, a rozmycie/wirtualne tło realnie się nie nakłada.

Diagnoza (na podstawie aktualnego kodu):
1) W `VideoBackgroundProcessor.processFrame()` efekt nakłada się tylko, gdy:
   - `maskData` istnieje oraz
   - `maskData.length === processWidth * processHeight`.
2) Segmentacja jest liczona na `this.videoElement` (`segmentForVideo(this.videoElement, ...)`), a render na canvas jest liczony na przeskalowanych wymiarach `processWidth/processHeight`.
3) Dla kamer HD (np. 1280x720) maska często ma rozmiar źródła, a canvas ma mniejszy rozmiar (np. 640x360), więc warunek długości maski nie przechodzi.
4) Skutek: pipeline zwraca strumień z canvas (często o mniejszej rozdzielczości / innym odczuwalnym rozmiarze), ale bez realnego efektu tła — dokładnie objaw zgłoszony przez Ciebie.
5) Dodatkowo w `start()` rozdzielczość jest wyliczana z `track.getSettings()` przed pełną gotowością video; gdy settings są niepełne, fallback 640x480 może dawać efekt „zmniejszenia”.

Plan implementacji:

1. Ujednolicenie wymiarów wejścia segmentacji i renderu (kluczowa poprawka)
- Plik: `src/components/meeting/VideoBackgroundProcessor.ts`
- Działania:
  - Dodać dedykowany canvas wejściowy do segmentacji (np. `inputCanvas/inputCtx`) w rozdzielczości przetwarzania.
  - W każdej klatce:
    - najpierw rysować `videoElement` -> `inputCanvas` w `processWidth/processHeight`,
    - uruchamiać `segmentForVideo(inputCanvas, timestamp)` zamiast `videoElement`.
  - Dzięki temu maska i frame będą zawsze w tym samym rozmiarze i warunek dopasowania przestanie blokować nakładanie efektu.

2. Stabilne wyznaczanie rozdzielczości po załadowaniu metadanych video
- Plik: `src/components/meeting/VideoBackgroundProcessor.ts`
- Działania:
  - Przenieść finalne wyliczenie `srcWidth/srcHeight` na moment po `loadeddata/play` (użyć `videoElement.videoWidth/videoHeight` jako źródła prawdy; settings tylko jako fallback).
  - Potem dopiero inicjalizować `canvas`, `blurredCanvas`, `maskCanvas`, `inputCanvas`.
- Efekt:
  - brak przypadkowego przejścia na 4:3 fallback,
  - mniej sytuacji „video się zmniejsza” po aktywacji efektu.

3. Nakładanie blur/image z tego samego źródła klatki
- Plik: `src/components/meeting/VideoBackgroundProcessor.ts`
- Działania:
  - W `applyBlur()` i `applyImageBackground()` używać wejścia klatki z canvasu przetwarzania (nie bezpośrednio `videoElement`), aby cały pipeline był spójny rozmiarowo.
- Efekt:
  - brak dryfu między maską a pikselami obrazu.

4. Twarde zabezpieczenie na niedopasowanie maski (awaryjnie)
- Plik: `src/components/meeting/VideoBackgroundProcessor.ts`
- Działania:
  - Dodać licznik kolejnych klatek bez prawidłowej maski.
  - Jeśli np. >30 klatek bez poprawnej maski: log ostrzegawczy + fallback kontrolowany (bez wywoływania błędu dla użytkownika), ale z informacją diagnostyczną.
  - Opcjonalnie: jednokrotna próba reinicjalizacji segmentera po progu błędów.
- Efekt:
  - brak „cichego” stanu, gdzie użytkownik nie wie co się stało.

5. Lepsza informacja zwrotna dla użytkownika (bez zmiany UX flow)
- Pliki:
  - `src/hooks/useVideoBackground.ts`
  - `src/components/meeting/VideoRoom.tsx`
- Działania:
  - Utrzymać obecne toasty błędu, ale doprecyzować komunikat dla sytuacji „segmentacja nie zwróciła maski / efekt niedostępny chwilowo”.
  - Logować konkretną przyczynę (`mask dimension mismatch`, `no mask frames`) dla szybkiej diagnostyki.
- Efekt:
  - przy kolejnych incydentach łatwiejsza analiza bez zgadywania.

Kolejność wdrożenia:
1) `VideoBackgroundProcessor`: wejściowy canvas + segmentacja na canvasie + rozdzielczość po metadata.
2) `VideoBackgroundProcessor`: spójne źródło dla blur/image + fallback licznik.
3) `useVideoBackground` i `VideoRoom`: doprecyzowanie komunikatów/logów.
4) Testy manualne E2E.

Plan testów po wdrożeniu:
1) Host, tryb speaker:
- włącz kolejno: lekkie rozmycie, mocne rozmycie, tło 1/2/3;
- potwierdź, że obraz nie „kurczy się”, tylko efekt faktycznie działa.
2) Host, tryby gallery i multi-speaker:
- powtórzyć wszystkie 5 efektów.
3) Uczestnik (druga karta/przeglądarka):
- sprawdzić te same tryby i efekty.
4) Przełączanie efektów „w locie”:
- blur-light -> blur-heavy -> image -> none.
5) Reacquire scenariusz:
- wyłącz/włącz kamerę, potem ponownie ustaw efekty.
6) Kontrola regresji:
- audio/video i screen share nadal działają poprawnie.

Ryzyko i wpływ:
- Ryzyko: niskie/średnie (dotyczy głównie jednego modułu przetwarzania).
- Wpływ pozytywny:
  - efekty tła zaczną działać rzeczywiście,
  - zniknie objaw „tylko zmniejsza video”,
  - większa przewidywalność we wszystkich trybach widoku i dla hosta/uczestników.
