
# Dodanie uploadu wideo z komputera do playlisty auto-webinarów

## Problem
Dialog "Dodaj nowe wideo" ma tylko pole tekstowe na URL. Brak możliwości przesłania pliku MP4 z komputera.

## Rozwiązanie
Zintegrować komponent `MediaUpload` (który już obsługuje upload na VPS, auto-detekcję czasu trwania i walidację) w dialogu dodawania wideo.

## Zmiany w `AutoWebinarManagement.tsx`

1. Dodać import `MediaUpload` (jeśli brak)
2. W dialogu "Dodaj nowe wideo" — zastąpić pole `Input` dla URL wideo komponentem `MediaUpload` z `allowedTypes={['video']}`:
   - Callback `onMediaUploaded` automatycznie ustawi `videoForm.video_url` i `videoForm.duration_seconds`
   - Zachować też możliwość ręcznego wklejenia URL (MediaUpload to obsługuje natywnie — ma zakładkę "Wklej URL")
3. Usunąć osobne pole "Czas trwania (sekundy)" — MediaUpload automatycznie wykrywa czas trwania i przekazuje go w callbacku `durationSeconds`
4. Jeśli czas trwania = 0 (fallback), zostawić pole do ręcznej korekty

## Efekt
Admin może dodać wideo do playlisty auto-webinarów na 2 sposoby:
- Prześlij plik z komputera (upload na VPS, auto-detekcja czasu trwania)
- Wklej URL ręcznie
