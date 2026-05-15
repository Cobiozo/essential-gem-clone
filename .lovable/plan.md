
## Cel

1. Poprawić stabilność odtwarzania wideo lekcji Akademii na urządzeniach Apple (iPhone Safari, iOS PWA, MacBook Safari).
2. Dodać sterowane przez admina (per lekcja) przyspieszenie 1.0x / 1.5x.
3. Zagwarantować, że zaliczenie lekcji nadal działa poprawnie przy 1.5x.

## Część 1 — Audyt iOS/Safari i poprawki stabilności

Obecny stan (z kodu):
- `SecureMedia.tsx` blokuje wszelkie zmiany `playbackRate` (handler `ratechange` natychmiast resetuje do 1).
- `videoBufferConfig.ts` ma już osobne profile mobile/iOS, ale część heurystyk (force-hide buffering, smart resume) działa agresywnie i przy słabszym łączu LTE iPhone potrafi „mrugać".
- `preload="auto"` na mobile = iOS Safari częściej zacina się przy starcie i przy przewijaniu segmentów HLS.
- Brak `playsInline` w niektórych ścieżkach renderu (sprawdzić linie ~1954/2069).

Planowane poprawki (tylko frontend / SecureMedia):
- iOS / iPadOS Safari: `preload="metadata"` zamiast `auto` dla pierwszego segmentu, pełny preload dopiero po pierwszym `play()` (mniej zacięć przy starcie, mniej memory pressure).
- Dodać `playsInline`, `webkit-playsinline`, `x-webkit-airplay="allow"` do wszystkich `<video>` w SecureMedia (jeśli któryś branch ich nie ma).
- Wydłużyć `stalledDebounceMs` na iOS do 2500–3000 ms i wyłączyć przełączanie na spinner gdy `bufferedAhead >= 1.5s` — eliminuje krótkie „mrugnięcia" na granicy segmentów HLS.
- Czyścić `videoElement.src` i `load()` przy odmontowaniu, żeby Safari nie trzymał dekodera (powód zacinania kolejnych lekcji w PWA).
- Dla MacBook Safari: wyłączyć `disablePictureInPicture` tam gdzie nie jest potrzebne, ale zostawić `controlsList="nodownload noremoteplayback"`.
- Test matrix po wdrożeniu: iPhone Safari (iOS 17/18), iPhone PWA (standalone), iPad Safari, MacBook Safari + Chrome — sprawdzenie startu, przewijania, fullscreen, wznowienia po lock screen.

## Część 2 — Przyspieszenie 1.0x / 1.5x sterowane per lekcja

### Schemat bazy
Migracja: dodanie kolumny do `training_lessons`:
```
playback_speed_enabled boolean not null default false
```
Brak zmian RLS — kolumna dziedziczy istniejące polityki.

### Panel admina
- `TrainingManagement.tsx` + `SortableLessonCard.tsx`: dodać przełącznik „Pozwól na odtwarzanie 1.5x" w edytorze lekcji (widoczny tylko gdy `media_type === 'video'`).
- Zapis pola w istniejącym formularzu lekcji.

### Player (SecureMedia + TrainingModule)
- `SecureMedia` dostaje nowy prop `allowedPlaybackRates?: number[]` (domyślnie `[1]`).
- W `handleRateChange` zezwalamy na wartości z `allowedPlaybackRates`, blokujemy pozostałe (utrzymujemy ochronę przed manipulacją z DevTools — wartości spoza listy są resetowane do 1).
- W trybie secure renderujemy istniejące `SecureVideoControls` z dwiema opcjami w dropdownie prędkości: 1x i 1.5x (gdy `allowedPlaybackRates.length > 1`), w przeciwnym razie ukrywamy kontrolkę prędkości.
- `TrainingModule.tsx`: przekazuje `allowedPlaybackRates={currentLesson.playback_speed_enabled ? [1, 1.5] : [1]}`.

### Typowanie
- `src/types/training.ts`: dodać `playback_speed_enabled?: boolean` do `TrainingLesson`.

## Część 3 — Wpływ przyspieszenia na zaliczanie lekcji

Analiza obecnej logiki (`TrainingModule.tsx` 896–923):
- `effectiveTimeSpent = Math.floor(videoPosition)`, gdzie `videoPosition = video.currentTime` (czas treści, NIE czas zegarowy).
- `requiredTime = video_duration_seconds || min_time_seconds`.
- Próg zaliczenia: `effectiveTimeSpent >= requiredTime * 0.98` dla wideo.

Wniosek: `currentTime` rośnie identycznie niezależnie od `playbackRate` (1.0x → 60 s w 60 s realnych; 1.5x → 60 s w 40 s realnych, ale `currentTime` nadal osiąga 60). Próg 98% długości treści zostaje spełniony tak samo. Zaliczenie działa poprawnie przy 1.5x bez zmian logiki.

Dodatkowe zabezpieczenia, które i tak wprowadzimy:
- W `handleVideoEnded` już jest `videoPositionRef.current = videoDurationRef.current` — to gwarantuje 100% nawet jeśli iOS skończy na 99.7%.
- Walidacja serwerowa pozostaje bez zmian (pole `video_position_seconds` zapisywane do `training_progress`).

## Część techniczna (dla deweloperów)

Pliki do modyfikacji:
- migracja SQL: `training_lessons.playback_speed_enabled boolean default false`
- `src/types/training.ts` — dodać pole
- `src/components/admin/TrainingManagement.tsx` + `SortableLessonCard.tsx` — UI przełącznika i zapis
- `src/components/SecureMedia.tsx` — prop `allowedPlaybackRates`, modyfikacja `handleRateChange`, ustawienia iOS preload/playsInline/cleanup
- `src/components/training/SecureVideoControls.tsx` — filtrowanie `SPEED_OPTIONS` po `allowedPlaybackRates`, ukrycie dropdownu gdy tylko jedna opcja
- `src/pages/TrainingModule.tsx` — przekazanie `allowedPlaybackRates` do `SecureMedia`
- `src/lib/videoBufferConfig.ts` — dostrojenie debounce/preload dla iOS

Zaliczanie lekcji nie wymaga zmian — jest niezależne od prędkości odtwarzania.

## Poza zakresem

- Zmiana algorytmu HLS lub serwera streamującego (`stream-media` edge function).
- Inne prędkości niż 1.0x i 1.5x (można dodać później przez rozszerzenie listy).
