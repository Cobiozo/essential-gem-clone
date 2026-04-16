
# Audyt iOS po przejściu na inną kartę: dlaczego wideo zawiesza się po powrocie

## Co wykazał audyt
Problem nie jest już tylko w samym `timeupdate`. Teraz główny błąd dotyczy powrotu z tła na iOS/Safari:

1. `SecureMedia.tsx` po `visibilitychange` na iOS tylko pokazuje `showTapToResume`, ale nie uruchamia prawdziwego procesu odzyskania odtwarzania.
2. `handleTapToResume`, `handlePlayPause` i `handleRetry` próbują głównie `video.play()` albo `video.load()`, ale:
   - nie przywracają pewnego checkpointu czasu,
   - nie czekają na `loadedmetadata/canplay` po reloadzie,
   - nie resetują wszystkich stanów blokujących UI.
3. `handleRetry` nie czyści m.in. `isInitialBuffering`, więc interfejs może zostać w stanie ciągłego „ładowania”.
4. `pageshow` dla iOS/bfcache tylko ustawia `isTabHidden=true`, zamiast aktywnie odzyskać odtwarzanie.
5. Aktualnie brak osobnego mechanizmu „checkpointu powrotu z tła” w samym `SecureMedia`, więc po background/foreground Safari może zgubić pipeline wideo mimo że zapis pozycji do `training_progress` działa.
6. Dodatkowo logi sieci nadal pokazują powtarzane `generate-media-token`, więc trzeba uszczelnić odświeżanie źródła przy recovery.

## Cel naprawy
Po wyjściu na inną kartę i powrocie na iPhone/iPad:
- wideo ma wracać do ostatniego miejsca,
- przycisk play/pause i „Napraw” mają realnie odzyskiwać odtwarzanie,
- ekran nie może wisieć w nieskończonym „Ładowanie...”,
- nie psujemy blokady sekwencyjnej lekcji ani ręcznego zaliczania.

## Plan zmian

### 1. `src/components/SecureMedia.tsx` — dodać osobny mechanizm checkpointu i recovery po background
Wprowadzę wewnętrzne refy typu:
- `resumeCheckpointRef`
- `wasBackgroundedRef`
- `resumeIntentRef`

Będą przechowywać:
- ostatni pewny czas (`currentTime` / `lastValidTimeRef`),
- czy użytkownik oglądał przed zejściem do tła,
- czy po powrocie próbować wznowić czy tylko przygotować wideo do ręcznego wznowienia.

Checkpoint będzie aktualizowany przy:
- `timeupdate`,
- `pause`,
- `visibilitychange`,
- `pagehide`.

To rozwiąże problem, że sam zapis do DB nie wystarcza, gdy Safari psuje bieżący element `<video>`.

### 2. `src/components/SecureMedia.tsx` — stworzyć jeden wspólny `recoverPlayback()`
Zamiast trzech różnych pół-napraw (`tap`, `play/pause`, `retry`) powstanie jedna funkcja odzyskiwania, używana przez:
- `handleTapToResume`
- `handlePlayPause`
- `handleRetry`
- powrót z `visibilitychange/pageshow` na iOS

Ta funkcja będzie:
1. czyścić stare flagi: `isBuffering`, `isSmartBuffering`, `showBufferingSpinner`, `isInitialBuffering`, `showTapToResume`, `canplayGuardRef`,
2. oceniać stan elementu (`readyState`, `networkState`, `src`, `paused`),
3. jeśli trzeba — przeładowywać źródło,
4. po `loadedmetadata/canplay` ustawiać zapisany czas,
5. dopiero potem próbować `play()` albo wyświetlać overlay „Dotknij, aby kontynuować”.

To jest kluczowa poprawka dla sytuacji „klikam play / napraw i nic się nie dzieje”.

### 3. `src/components/SecureMedia.tsx` — poprawić logikę `visibilitychange`, `pagehide`, `pageshow`, `focus`
Obecny flow na iOS jest za słaby. Zmienię go tak:

- przy zejściu do tła:
  - zapisz checkpoint,
  - oznacz `wasBackgroundedRef = true`,
  - bezpiecznie zatrzymaj odtwarzanie.

- przy powrocie:
  - nie tylko `setShowTapToResume(true)`,
  - tylko:
    - sprawdź, czy wideo ma wystarczający stan do wznowienia,
    - jeśli nie — uruchom recovery,
    - jeśli tak — przygotuj wznowienie z checkpointu.

Szczególnie poprawię `pageshow` dla iOS/bfcache, bo teraz ustawia tylko stan ukrytej karty i zostawia komponent w martwym stanie.

### 4. `src/components/SecureMedia.tsx` — naprawić manualne „Napraw”
`handleRetry` zostanie przebudowany:
- będzie używał checkpointu zamiast tylko `lastValidTimeRef`,
- po `video.load()` nie będzie od razu ustawiać `currentTime`, tylko zrobi to po gotowości metadanych,
- wyczyści `isInitialBuffering`, żeby interfejs nie wisiał w „ładowaniu”,
- jeśli potrzeba, odświeży źródło/token zamiast w kółko próbować na uszkodzonym stanie Safari.

### 5. `src/components/SecureMedia.tsx` — uszczelnić protected source / token refresh
Ponieważ logi pokazują wielokrotne `generate-media-token`, dopracuję recovery źródła:
- reset `processingUrlRef` po sukcesie / cleanup,
- osobna ścieżka „odzyskaj ten sam materiał po background” bez podwójnego generowania tokenu,
- jeśli źródło naprawdę jest martwe, dopiero wtedy świeży token + restore pozycji.

To zmniejszy ryzyko, że po powrocie Safari utknie między starym `src`, nowym tokenem i niedokończonym reloadem.

### 6. `src/components/training/VideoControls.tsx`
Utrzymam przyciski aktywne na iOS, ale dopasuję komunikaty/stany do nowego recovery:
- play ma uruchamiać prawdziwe wznowienie,
- „Napraw” ma wymuszać pełny recovery flow,
- komunikat o ukrytej karcie nie może blokować użytkownika po powrocie, jeśli recovery już się udało.

### 7. `src/components/training/SecureVideoControls.tsx`
Dla spójności zrobię ten sam wzorzec odzyskiwania także dla trybu `secure`, żeby iOS nie miał podobnych anomalii w innych miejscach aplikacji korzystających z tego samego playera.

## Zakres plików
- `src/components/SecureMedia.tsx` — główna naprawa
- `src/components/training/VideoControls.tsx` — obsługa UI/retry/play po recovery
- `src/components/training/SecureVideoControls.tsx` — ujednolicenie zachowania na iOS
- opcjonalnie drobna korekta w `src/lib/videoBufferConfig.ts`, jeśli po wdrożeniu będzie potrzebny osobny timeout dla recovery po background

## Efekt po wdrożeniu
Na iOS/Safari po przejściu do innej karty i powrocie:
- nagranie nie utknie w nieskończonym ładowaniu,
- wróci do ostatniego miejsca,
- play/pause i „Napraw” znów będą działały,
- stan buforowania nie będzie „fałszywie” blokował odtwarzania,
- nie naruszymy zasad Akademii: sekwencyjności lekcji, ręcznego zaliczania i blokady przewijania do przodu.
