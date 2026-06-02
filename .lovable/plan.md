## Cel
Admin ma kontrolować rozmiar i pozycję intro wideo, a podgląd ma pokazywać realny wygląd (overlay na całym ekranie z wideo w wybranym rozmiarze i pozycji), nie tylko film w okienku dialogu.

## Zmiany

### 1. Baza danych — nowe kolumny w `intro_video_settings`
- `display_size` (text, default `'medium'`) — `small` / `medium` / `large` / `fullscreen` / `custom`
- `custom_width_percent` (int, default `60`) — szerokość wideo w % viewportu (20–100), używana gdy `display_size='custom'`
- `position` (text, default `'center'`) — `center` / `top` / `bottom` / `top-left` / `top-right` / `bottom-left` / `bottom-right`
- `object_fit` (text, default `'contain'`) — `contain` / `cover`
- `backdrop_style` (text, default `'solid'`) — `solid` (czarne tło) / `blur` (rozmycie) / `dim` (półprzezroczyste)
- `border_radius` (int, default `16`) — px (0–48)

### 2. `useIntroVideoSettings.ts`
- Dodać te pola do typu `IntroVideoSettings` i do `normalizeSettings` z bezpiecznymi defaultami.

### 3. `IntroVideoOverlay.tsx` (produkcyjny overlay)
- Stosować nowe pola: rozmiar (preset lub `custom_width_percent`), pozycję (flex alignment), `object-fit`, tło backdrop, zaokrąglenia.
- Fullscreen → wideo zajmuje cały viewport. Pozostałe rozmiary → karta wideo w wybranym miejscu na backdropie.

### 4. `IntroVideoSettingsPanel.tsx` — nowa sekcja "Wygląd i pozycja"
- Select „Rozmiar" (Mały 30% / Średni 60% / Duży 85% / Pełny ekran / Niestandardowy)
- Slider szerokości (widoczny tylko dla `custom`)
- Select pozycji (siatka 3×3 jako przyciski lub zwykły select 7 opcji)
- Select dopasowania (Wpasuj / Wypełnij)
- Select tła (Czarne / Rozmycie / Przyciemnione)
- Slider zaokrągleń (0–48 px), wyłączony przy fullscreen

### 5. `IntroVideoPreviewDialog.tsx` — realistyczny podgląd
- Zamiast dotychczasowej karty: renderować pełnoekranową ramkę „symulacja viewportu" (np. `aspect-video` 16:9 reprezentująca ekran użytkownika) z prawdziwym `IntroVideoOverlay`-stylem w środku — tak samo jak będzie widać produkcyjnie.
- Pokazać przycisk „Pomiń" i kontrolkę dźwięku w tej samej pozycji co w realnym overlay.
- Panel z parametrami (momenty, częstotliwość, rozmiar, pozycja) zostaje pod podglądem.

### Szczegóły techniczne
- Wydzielić wspólny komponent `IntroVideoStage` (shared), używany zarówno przez `IntroVideoOverlay` (produkcja, fixed inset-0) jak i `IntroVideoPreviewDialog` (preview, absolute w kontenerze 16:9). Komponent przyjmuje `settings` i `mode: 'live' | 'preview'`.
- Mapowanie rozmiarów: small=30%, medium=60%, large=85%, fullscreen=100% z `object-fit: cover` i bez paddingu.
- Mapowanie pozycji do klas Tailwind: `items-*` / `justify-*` na kontenerze flex.

## Bez zmian
- Logika trigger_moments, frequency, upload, bucket, RLS — pozostają nietknięte.
