
Cel: usunąć opóźnienia/zamrażanie obrazu z telefonu oraz naprawić jakość maski rozmycia (żeby nie rozmywało twarzy/sylwetki).

## Co wykazała analiza

1. Pipeline tła na mobile jest zbyt ciężki:
- przetwarzanie idzie na pełnej rozdzielczości kamery (`width/height` z tracka, często 1080p),
- każda klatka robi segmentację + `getImageData`/`putImageData` + dodatkowy odczyt rozmytego bufora,
- output jest wymuszony na `captureStream(30)`,
- to powoduje przeciążenie CPU/GPU na telefonie i efekt „freeze”/dużego laga lokalnie i zdalnie.

2. Rozmycie „lekkie/mocne” jest zbyt agresywne dla sylwetki:
- obecne progi blendowania (`EDGE_LOW=0.3`, `EDGE_HIGH=0.7`) dopuszczają częściowe rozmycie pikseli osoby,
- przy cięższych warunkach mobilnych maska jest mniej stabilna, więc twarz i kontur są nadpisywane.

3. Jest niespójność w logice odzyskiwania streamu:
- `reacquireLocalStream()` po ponownym nałożeniu tła ustawia `localStreamRef.current` na stream przetworzony, ale zwraca surowy `stream`,
- to grozi rozjazdem stanu przy kolejnych operacjach i może pogłębiać problemy po reconnectach.

## Plan zmian (implementacja)

### 1) Adaptacyjna wydajność VideoBackgroundProcessor (najważniejsze)
Plik: `src/components/meeting/VideoBackgroundProcessor.ts`

- Dodać profil wydajności zależny od urządzenia:
  - mobile: niższa rozdzielczość przetwarzania (np. max 640px szerokości), output FPS 12–15,
  - desktop: wyższa (np. 960px), output FPS 24.
- Rozdzielić:
  - rozdzielczość wejścia/segmentacji (niższa),
  - rozdzielczość wyjścia do tracka (utrzymana proporcja, ale bez pełnego 1080p na słabszych urządzeniach).
- Dodać throttling segmentacji:
  - segmentacja np. co 66–100 ms na mobile,
  - między segmentacjami używać ostatniej maski (bez ponownego wywołania modelu każdej klatki).
- Dodać zabezpieczenie przeciążenia:
  - gdy czas renderu klatki regularnie przekracza budżet, automatycznie obniżyć jakość (FPS/procesing scale), a w skrajnym przypadku przejść chwilowo na pass-through.

Efekt: znacznie mniejsze opóźnienie i brak zamrażania local preview na telefonie.

### 2) Korekta jakości maski i agresywności blur
Plik: `src/components/meeting/VideoBackgroundProcessor.ts`

- Ujednolicić interpretację maski:
  - traktować `confidenceMasks[0]` jako background confidence (zgodnie z modelem selfie segmenter),
  - dodać jawny helper i usunąć mylące komentarze.
- Zaostrzyć ochronę osoby:
  - podnieść progi blendowania (np. `EDGE_LOW ~ 0.55-0.65`, `EDGE_HIGH ~ 0.8-0.9`),
  - dodać „foreground lock” (piksele o niskiej pewności tła zawsze zostają oryginalne).
- Rozdzielić profile blur:
  - lekkie: subtelne rozmycie + najbardziej konserwatywne progi,
  - mocne: większy radius, ale nadal z ochroną osoby (żeby mocne nie rozmywało twarzy).

Efekt: lekkie rozmywa tło delikatnie, mocne rozmywa tło mocno, ale uczestnik pozostaje ostry.

### 3) Naprawa spójności reconnect/reacquire streamów
Plik: `src/components/meeting/VideoRoom.tsx`

- W `reacquireLocalStream()`:
  - po `applyBackground(...)` zwracać finalnie aktywny stream (przetworzony, jeśli został użyty), nie surowy.
  - ujednolicić replaceTrack tak, by zawsze brał finalny track z `localStreamRef.current`.
- Dodać ten sam mechanizm po `restoreCamera()` (po zakończeniu share ekranu), aby efekt tła był odtwarzany spójnie i bez regresji.

Efekt: po reconnectach i przejściach kamera↔ekran strumień nie „rozjeżdża się”, audio/video wracają stabilniej.

### 4) Ograniczenie kosztu na etapie getUserMedia (mobile-first)
Plik: `src/components/meeting/VideoRoom.tsx`

- Zamiast `video: true` dodać jawne `VIDEO_CONSTRAINTS`:
  - mobile: niższa rozdzielczość + niższy frameRate,
  - desktop: umiarkowane wartości (nie maksymalne).
- Użyć tych samych constraints w:
  - inicjalizacji,
  - `reacquireLocalStream`,
  - `restoreCamera`.

Efekt: mniej przeciążeń jeszcze zanim pipeline tła zacznie działać.

## Kolejność wdrożenia

1. `VideoBackgroundProcessor` – profil wydajności + throttling + cache maski.  
2. `VideoBackgroundProcessor` – nowe progi i foreground lock dla blur.  
3. `VideoRoom` – fix zwracanego streamu i spójność replaceTrack.  
4. `VideoRoom` – jednolite mobile constraints dla wszystkich getUserMedia.  
5. Krótka walidacja manualna scenariuszy (mobile↔desktop, light/heavy blur, reconnect).

## Kryteria akceptacji

- Mobile local preview nie zamraża się i nie ma dużego laga.
- Strumień z mobile widoczny na desktopie ma płynność akceptowalną (bez wielosekundowego opóźnienia).
- „Lekkie rozmycie” rozmywa tło, nie twarz.
- „Mocne rozmycie” nie rozmywa sylwetki/twarzy (poza naturalnym feather na krawędzi).
- Po utracie i odzyskaniu mediów obraz+dźwięk wracają bez ręcznych obejść.

## Sekcja techniczna (ryzyka i zabezpieczenia)

- Ryzyko: zbyt mocne obniżenie quality na mobile pogorszy estetykę.  
  Mitigacja: adaptacyjne profile i stopniowe obniżanie jakości zamiast twardego fallbacku.
- Ryzyko: różnice między przeglądarkami mobilnymi.  
  Mitigacja: heurystyka mobile + defensywne fallbacki CPU/pass-through + czytelne logi.
- Ryzyko: regresja po screen share.  
  Mitigacja: wspólna ścieżka „final stream selection” dla reacquire i restoreCamera.
