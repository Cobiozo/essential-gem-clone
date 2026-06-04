# Naprawa uploadu i odtwarzania wideo w News Hub

## Cel
Wyeliminować sytuację, w której do bazy trafiają URL-e wyglądające jak `.mp4`, ale serwer zwraca pod nimi HTML aplikacji (fallback SPA), przez co odtwarzacze pokazują 0:00 bez żadnego komunikatu.

## Zakres zmian (frontend + konfiguracja)

### 1. `src/lib/storageConfig.ts`
- Dodać dedykowane ścieżki folderów VPS dla News Hub, np.:
  - `VPS_FOLDERS.NEWS_HUB_VIDEO = 'training-media/news-hub/video'`
  - `VPS_FOLDERS.NEWS_HUB_IMAGE = 'training-media/news-hub/image'`
  - `VPS_FOLDERS.NEWS_HUB_FILE  = 'training-media/news-hub/file'`
- Zostawić `UPLOAD_API_URL = '/upload'` jako jedyne źródło prawdy o endpointzie.

### 2. `src/hooks/useNewsHub.ts`
- `uploadToVps` ma używać `STORAGE_CONFIG.UPLOAD_API_URL` (a nie zakodowanego `'/upload'`).
- `VPS_FOLDERS` w hooku wymienić na powyższe wartości z `storageConfig` — bloki wideo lecą do folderu wideo, nie do `training-media` (wspólny worek z `files`).
- Rozszerzyć `uploadNewsHubFile` o typ pliku oczekiwany na wyjściu (`'video' | 'image' | 'file' | 'cover'`) i wybierać folder na tej podstawie.
- `verifyUploadedUrl` musi:
  - Robić `HEAD` (i fallback `GET` z `Range: bytes=0-0`, jeśli HEAD zwróci 405/403).
  - Odrzucać każdą odpowiedź `text/html` oraz brak `content-type`.
  - Dla uploadów wideo dodatkowo wymagać `content-type` zaczynającego się od `video/`. Jeśli serwer zwraca `application/octet-stream`, sprawdzać po rozszerzeniu i logować ostrzeżenie.
  - Zwracać szczegółowy powód błędu (do toasta), nie samo `false`.
- W razie negatywnej walidacji: NIE zwracać URL-a do edytora — rzucać błąd z komunikatem PL.

### 3. Edytor (`MediaControls.tsx`, `BlockListEditor.tsx`)
- Wywołania `uploadNewsHubFile(file, 'media')` dla bloków/postów typu `video` zamienić na warianty z jawnym typem (`'video'`), żeby trafiały do folderu wideo.
- Po nieudanej walidacji pokazać toast PL: „Plik nie został poprawnie zapisany na serwerze (serwer zwraca HTML zamiast wideo). Skontaktuj się z administratorem.” i NIE zapisywać URL-a w bloku.
- Dodać walidację MIME po stronie klienta przed wysyłką (`STORAGE_CONFIG.ALLOWED_TYPES.video`).

### 4. Odtwarzacze (`PostContent.tsx`, `BlockRenderer.tsx`)
- Każdy `<video>` z URL-em ma:
  - Stan `error` ustawiany na `onError` ORAZ jeśli `readyState === 0` i `duration === 0` po `loadedmetadata` w ciągu 5s.
  - Dodatkowo na mount: lekki `fetch(url, { method: 'HEAD' })` — jeśli `content-type` to `text/html`, ustaw `error` od razu bez prób renderu `<video>`.
  - W stanie błędu wyświetlać czytelny komunikat PL zamiast pustego playera 0:00:
    „Nie można odtworzyć tego pliku wideo. Plik mógł zostać usunięty lub serwer zwraca nieprawidłową odpowiedź.”
  - Zachować obecne fallbacki dla YouTube/Vimeo (bez zmian).

### 5. (Opcjonalnie / sanity) Migracja danych
- Brak migracji danych. Istniejące wadliwe URL-e zostaną oznaczone jako błędne w UI dzięki nowemu komponentowi błędu (pkt 4).
- Admin może podmienić plik ręcznie z edytora.

## Co NIE jest zmieniane
- Endpoint `/upload` na VPS (poza projektem).
- Logika Supabase Storage dla małych plików (≤ 2MB) — pozostaje jako fallback.
- Polityki RLS i bucket `news-hub-media`.

## Weryfikacja
1. Upload pliku `.mp4` > 2MB w bloku „video" → URL kończy się na `/training-media/news-hub/video/...`, `HEAD` zwraca `content-type: video/mp4`, player odtwarza.
2. Symulacja awarii (ręcznie podany URL zwracający HTML) → player pokazuje komunikat błędu, nie 0:00.
3. Próba uploadu pliku `.exe` jako wideo → odrzucone po stronie klienta z toastem.
4. Upload pliku ≤ 2MB nadal idzie do Supabase Storage (bez regresji).
