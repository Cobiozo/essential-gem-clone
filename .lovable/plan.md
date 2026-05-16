## Cel

Przyspieszenie 1.5x ma być dostępne PRZED zaliczeniem lekcji (jeśli admin włączył), ale wyświetlane w formie nakładki wewnątrz okna wideo (jak natywne kontrolki po zaliczeniu), a nie jako dodatkowe przyciski w pasku pod wideo.

## Stan obecny

W `SecureMedia.tsx` przed zaliczeniem (`controlMode === 'restricted'`, linie 2073–2153) wideo renderuje się z `controls={false}` + pasek `<VideoControls>` pod spodem. Aktualnie dodaliśmy przyciski 1x/1.5x w pasku `VideoControls.tsx` — to nie jest to, czego oczekuje użytkownik.

Po zaliczeniu (linie 2191–2218) wideo używa natywnych `controls` przeglądarki — gdzie prędkość jest dostępna z poziomu kontrolek wewnątrz ramki wideo.

## Zmiana

1. **Usunięcie przycisków prędkości z `VideoControls.tsx`** (pasek pod wideo w trybie restricted). Wracamy do stanu sprzed ostatniej zmiany — żadnych 1x/1.5x w pasku.

2. **Dodanie nakładki prędkości wewnątrz ramki wideo** w trybie restricted (`SecureMedia.tsx` ~linia 2078–2133):
   - Mały przycisk w prawym górnym rogu wideo, pokazuje aktualną prędkość (np. „1×"), styl: półprzezroczyste tło `bg-black/50`, biały tekst, zaokrąglony, ~32–36 px wysokości, padding 8–10 px.
   - Widoczny tylko gdy `allowedPlaybackRates.length > 1` (czyli admin włączył 1.5x dla lekcji).
   - Kliknięcie otwiera mały popover/dropdown z opcjami 1× / 1.5× (lista z `allowedPlaybackRates`).
   - Pozycja: `absolute top-2 right-2 z-20`, nie koliduje z overlay „Play" (który jest w centrum) ani „Tap to resume".
   - W trybie fullscreen pozostaje w obrębie wideo (rodzic `relative`).

3. **Zachowanie blokad**:
   - Brak zmian w blokadzie przewijania — pasek postępu w `VideoControls` nadal bez seek.
   - `handleSpeedChange` / `handleRateChange` z ochroną listy `allowedPlaybackRates` (już zaimplementowane) pozostaje.

4. **Po zaliczeniu** (natywne controls, linia 2191+): bez zmian — Safari/Chrome same pokazują menu prędkości w natywnych kontrolkach.

5. **Zaliczenie przy 1.5×**: bez zmian w logice (`currentTime` niezależny od prędkości — zweryfikowane wcześniej).

## Pliki

- `src/components/SecureMedia.tsx` — dodać overlay prędkości w branchu restricted (~linia 2133), usunąć przekazywanie `playbackRate`/`onSpeedChange`/`allowedPlaybackRates` do `<VideoControls>`.
- `src/components/training/VideoControls.tsx` — usunąć propsy `playbackRate`, `onSpeedChange`, `allowedPlaybackRates` oraz blok przycisków 1x/1.5x.

## Poza zakresem

- Zmiany w `SecureVideoControls.tsx` (tryb secure po zaliczeniu nie używa restricted ścieżki, ale tam też menu prędkości jest w pasku — użytkownik wskazał, że po zaliczeniu jest dobrze, bo to natywne controls; `SecureVideoControls` nie jest aktywne w `TrainingModule`, więc nie ruszamy).
