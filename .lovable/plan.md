## Cel

Wgrywanie dużych plików MP4 (np. 142 MB) ma działać bezbłędnie. Wszystkie pliki powyżej progu mają iść przez VPS/multer (`/upload`), z pominięciem Supabase Storage — bo bucket `training-media` ma twardy limit 100 MB i Supabase server odrzuca takie pliki przed transferem.

## Diagnoza

1. Bucket Supabase `training-media` ma `file_size_limit = 104857600` (100 MB) — migracja `20250929184616_*`.
2. `useLocalStorage.uploadFile` rutuje pliki ≤ 2 MB → Supabase, > 2 MB → VPS `/upload`. To w teorii powinno omijać Supabase dla 142 MB, ale:
   - `MediaUpload` przekazuje `folder: 'training-media'`, sugerując bucket o tej nazwie; w praktyce Supabase wybiera bucket po rozszerzeniu (`cms-videos` dla mp4), co jest mylące i niespójne z polityką „wszystko duże → multer".
   - Fallback z Supabase → VPS dla małych plików nie weryfikuje, czy VPS faktycznie zapisał plik (HTML/404 nie jest wychwytywane — analogiczny problem był w News Hub).
3. `useNewsHub` ma już sensowne rozdzielenie (>2 MB → VPS z weryfikacją `verifyUploadedUrl`). `useLocalStorage` (używany przez `MediaUpload`, edytor CMS, BlockEditor maili) — nie ma weryfikacji.
4. Limit bucketu w Supabase i tak blokuje zapis, więc dla MP4 należy **całkowicie wykluczyć Supabase** (niezależnie od rozmiaru) i kierować wszystkie wideo na VPS multer.

## Zakres zmian

### 1. `src/hooks/useLocalStorage.ts` — twarda zasada „wideo zawsze na VPS"
- Dodać `shouldUseVps(file)`:
  - `true` jeśli `file.size > SUPABASE_MAX_SIZE_BYTES` **lub** rozszerzenie/MIME to wideo (`mp4|webm|mov|avi|mkv|m4v`) **lub** audio > 2 MB.
- Wideo i pliki > 2 MB: **bez próby Supabase**, od razu XHR na `STORAGE_CONFIG.UPLOAD_API_URL` (zamiast hardkodowanego `/upload`).
- Po uploadzie na VPS dla wideo: GET `Range: bytes=0-0` i walidacja jak w `useNewsHub.verifyUploadedUrl` (odrzucamy 404, `text/html`, akceptujemy `video/*` / `application/octet-stream` / brak `content-type` przy 200/206). W razie błędu — czytelny komunikat, brak zapisu URL-a.
- Usunąć cichy fallback „mały plik → Supabase, error → VPS" dla typów wideo (dla obrazów zostaje bez zmian).

### 2. `src/lib/storageConfig.ts`
- Dodać `VIDEO_EXTENSIONS` i `VIDEO_MIME_PREFIXES` jako jedno źródło prawdy.
- Dodać `VPS_FORCE_KINDS: ['video']` — typy, które zawsze idą na VPS.
- Limit `MAX_FILE_SIZE_MB` zostaje 2 GB (limit multer/VPS).

### 3. `src/components/MediaUpload.tsx`
- Przy wyborze pliku wideo komunikować jasno: „Wideo zostanie wgrane na serwer plików (VPS), max 2 GB" zamiast wprowadzającej w błąd informacji o bucketcie.
- Komunikaty błędów z `useLocalStorage` mają być wyświetlane bez obcinania (pełen `error.message`).

### 4. Migracja Supabase — zaostrzyć politykę bucketu `training-media`
- Dwa warianty (decyzja w technicznej części):
  - **A (zalecane)**: pozostawić limit 100 MB (Supabase i tak nie jest naszą docelową ścieżką dla wideo). Brak migracji.
  - **B**: podnieść `file_size_limit` do np. 2 GB tylko gdy chcemy zachować Supabase jako rezerwę. Większe ryzyko kosztów i timeoutów.
- Plan zakłada wariant **A** — kod kieruje wideo wyłącznie na VPS, więc limit Supabase staje się nieistotny dla tego flow.

### 5. (Opcjonalnie, jeśli potrzebne) `uploads/.gitkeep` / dokumentacja VPS
- Brak zmian po stronie aplikacji — multer na VPS już obsługuje `training-media` i limit 2 GB (zgodnie z istniejącą polityką „VPS Uploads"). Jeżeli serwer zwraca 413/404 dla 142 MB → problem jest po stronie konfiguracji multer (`limits.fileSize`) i nginx (`client_max_body_size`) na VPS — wymaga interwencji admina (poza kodem repo).

## Sekcja techniczna

- Detekcja wideo:
  ```ts
  const isVideo = (f: File) =>
    f.type.toLowerCase().startsWith('video/') ||
    /\.(mp4|webm|mov|avi|mkv|m4v|wmv|flv)$/i.test(f.name);
  ```
- Weryfikacja po uploadzie (re-use wzorca z `useNewsHub`):
  ```ts
  const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
  // odrzuć 404, text/html; wymagaj video/* | application/octet-stream | '' przy 200/206
  ```
- Zamiana `xhr.open('POST', '/upload')` → `xhr.open('POST', STORAGE_CONFIG.UPLOAD_API_URL)`.
- Brak zmian w `useNewsHub.ts` (już zgodny) — tylko spójność `STORAGE_CONFIG`.
- Jeśli serwer VPS nadal odrzuca 142 MB: sprawdzić `client_max_body_size` w nginx i `multer({ limits: { fileSize: 2 * 1024 * 1024 * 1024 } })` na Express — to zmiana operacyjna VPS, nie kodu Lovable.

## Plik(i) do zmiany

- `src/hooks/useLocalStorage.ts` — routing wideo na VPS + weryfikacja URL.
- `src/lib/storageConfig.ts` — stałe `VIDEO_EXTENSIONS`, helper.
- `src/components/MediaUpload.tsx` — komunikaty UX, pełne błędy.
- (Bez migracji DB — wariant A.)

## Efekt

- 142 MB MP4 przez `MediaUpload` → multer VPS, weryfikacja URL → zapis w bazie tylko jeśli plik faktycznie istnieje.
- Brak prób trafiania w Supabase 100 MB limit.
- Spójne zachowanie z News Hub.