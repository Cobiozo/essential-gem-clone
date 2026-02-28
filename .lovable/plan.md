
Cel: usunąć „tragiczny” kontur bez psucia obecnych funkcji spotkań (PiP, screen share, uploady teł, guest flow, mirroring lokalnego podglądu).

## Co realnie jest nie tak (po analizie kodu + Twojego tekstu + screenshotu)

1. Problem dotyczy głównie `src/components/meeting/VideoBackgroundProcessor.ts` (pipeline maski), nie warstwy uploadu teł.
2. W kodzie jest już:
   - temporal smoothing,
   - feathering przez blur,
   - requestAnimationFrame,
   - próba GPU delegate.
3. Mimo tego efekt dalej słaby, bo obecny pipeline jest nadal „threshold-heavy” i ma widoczne artefakty na krawędziach przy ruchu:
   - segmentacja jest throttlowana (70–150ms),
   - postprocessing nadal mocno „przycina”/„dociska” alfę,
   - profil wydajności obniża rozdzielczość maski przy większej liczbie uczestników.
4. Dodatkowo: wcześniejsze założenie „selfie_segmenter = full-res model” jest zbyt optymistyczne. Z dokumentacji MediaPipe wynika, że modele selfie działają na małych wejściach (np. 256x256 / 144x256), więc samo przełączenie modelu nie gwarantuje idealnej granicy.

### Do I know what the issue is?
Tak — główny problem to nie brak jednej „magicznej” opcji modelu, tylko kombinacja:
- zbyt rzadkiej aktualizacji maski,
- agresywnych progów/clampów,
- oraz globalnego (nie edge-aware) wygładzania, które daje albo „halo”, albo „poszarpanie”.

## Ocena tekstu, który podałeś (czy to dobre rozwiązanie?)

Twoje założenia są kierunkowo dobre, ale wymagają korekty:

1. **„Model complex, nie lite”**  
   - Dobre jako intencja (więcej jakości).
   - W praktyce w tym stacku MediaPipe nie ma prostego przełącznika „complex” jak np. w innych modułach. Trzeba dobrać pipeline i profile, nie tylko URL modelu.
2. **Temporal smoothing**  
   - Bardzo dobre i potrzebne, ale musi być adaptacyjne (mocniejsze w bezruchu, słabsze przy szybkim ruchu ręki/głowy), inaczej daje smużenie.
3. **Edge feathering / anti-aliasing**  
   - Słuszny kierunek.  
   - WebGL shader byłby najlepszy, ale duże ryzyko regresji. Da się osiągnąć bardzo dobrą jakość edge-aware featheringiem w Canvas2D bez przebudowy całego renderera.
4. **Synchronizacja / rAF / akceleracja**  
   - rAF i próba GPU już są; brak jest bardziej „quality-first” parametrów dla trybu `image`.

Wniosek: Twoja propozycja jest dobra koncepcyjnie, ale trzeba ją wdrożyć jako zmianę pipeline’u jakości, nie tylko zamianę modelu.

## Plan wdrożenia (bez naruszenia istniejącej funkcjonalności)

## 1) Quality-first profil tylko dla trybu `image`
Plik: `src/components/meeting/VideoBackgroundProcessor.ts`

- Dodać osobne ustawienia dla `image`:
  - wyższy minimalny `maxProcessWidth` (np. nie schodzić poniżej 640 dla image mode),
  - krótszy `segmentationIntervalMs` (np. 33–50ms dla image mode, zamiast 70–150ms).
- Zostawić obecne profile dla `blur-light` i `blur-heavy` bez zmian.

Dlaczego: poprawa stabilności konturu przy ruchu bez ruszania trybów blur.

## 2) Adaptacyjne temporal smoothing (motion-aware)
Plik: `VideoBackgroundProcessor.ts` (`refineMask`)

- Zamiast stałej wagi:
  - wykrywać prosty poziom ruchu (np. średnia różnica maski klatka-do-klatki),
  - przy dużym ruchu zmniejszać wagę poprzedniej klatki,
  - przy małym ruchu zwiększać wagę dla stabilności.
- Efekt: mniej „rwania” i mniej „ciągnięcia” konturu.

## 3) Edge-aware feathering zamiast globalnego rozmycia maski
Plik: `VideoBackgroundProcessor.ts`

- Zbudować narrow edge band (obszar przejściowy maski).
- Rozmywać i wygładzać tylko ten pas krawędzi, nie całą maskę.
- Zastosować `smoothstep` w strefie przejściowej zamiast agresywnego hard-clampa na dużym zakresie.

Dlaczego: usuwa schodki i halo jednocześnie, lepiej zachowuje włosy i okulary.

## 4) Dwuetapowe mieszanie alfa (core + transition)
Plik: `VideoBackgroundProcessor.ts` (`applyImageBackground`)

- Podział na:
  - **core foreground** (kopiowany 1:1),
  - **core background** (podmiana 1:1),
  - **transition band** (miękkie blendowanie).
- Progi dobierane dla „zero bleed first”, ale z zachowaniem przejścia na obrzeżu.
- Obecny fix lustrzanego tła zostaje bez zmian.

## 5) Bezpieczna kompatybilność wsteczna
- Nie zmieniać:
  - `useVideoBackground.ts` API,
  - logiki spotkań w `VideoRoom.tsx`,
  - screen share / PiP / guest mode / upload custom backgrounds.
- Jeśli urządzenie nie wyrabia:
  - automatyczny fallback do obecnych „lighter” parametrów (bez wyłączania całej funkcji).

## 6) Telemetria debugowa (krótkoterminowo)
Plik: `VideoBackgroundProcessor.ts`

- Dodać debug logi quality path:
  - jaki model finalnie załadowany,
  - realny processing size,
  - realny segmentation interval,
  - motion score.
- To pozwoli szybko odróżnić „problem modelu” od „problemów parametrów”.

## Kryteria akceptacji (żeby mieć pewność, że jest „raz a porządnie”)

1. Kontur przy ruchu ręką nie „odrywa się” od sylwetki.
2. Mniej przebijania półek/mebli przez obrzeże barków i dłoni.
3. Włosy/zarost nie są brutalnie obcięte.
4. Tło nadal nie jest lustrzane.
5. Brak regresji:
   - blur-light / blur-heavy działają jak wcześniej,
   - screen share i PiP bez zmian,
   - upload/usuwanie własnych teł bez zmian.

## Zakres plików do modyfikacji

- Główny: `src/components/meeting/VideoBackgroundProcessor.ts`
- Bez koniecznych zmian w innych plikach (chyba że opcjonalny przełącznik „Jakość konturu: standard/precyzyjna” w UI — wtedy osobny, mały krok po potwierdzeniu).

To jest najbezpieczniejsza ścieżka: maksymalna poprawa konturu przy minimalnym ryzyku naruszenia obecnej funkcjonalności.
