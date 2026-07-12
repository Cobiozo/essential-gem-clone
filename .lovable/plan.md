## Cel
Odtwarzanie wideo z Bazy Wiedzy (Zdrowa Wiedza) na iPhone/iPad ma być stabilne, z jasną informacją zwrotną, gdy plik jest niekompatybilny z Safari — zamiast czarnego ekranu lub „wiecznego" spinnera.

## Diagnoza (audyt)

Ścieżka odtwarzania w `HealthyKnowledgePlayer.tsx` używa `SecureMedia` bez `controlMode`, więc renderowana jest gałąź „native controls" (`SecureMedia.tsx` linie ~2234-2263) — czyste `<video src controls playsInline>` bez `<source type>`.

Znalezione realne problemy pod iOS:

1. **Brak `onError`/fallbacku w tej gałęzi.** Gdy Safari nie umie zdekodować pliku (HEVC/H.265 z iPhone'a, WebM/VP9, .mov z niestandardowym codekiem), `<video>` po cichu wyrzuca `MEDIA_ERR_SRC_NOT_SUPPORTED` i użytkownik widzi tylko czarny prostokąt + spinner „Ładowanie…" na zawsze (spinner jest sterowany `videoReady`, który nigdy nie stanie się `true`).
2. **Brak jawnego `<source type>`.** Bez `type` iOS Safari czasem odrzuca strumień z VPS, jeśli `Content-Type` z serwera jest nietypowy (`application/octet-stream`) — wtedy `canPlayType` się nie odzywa i plik jest ignorowany.
3. **`preload="auto"` dla VPS.** Na iOS Safari z LTE/3G to bywa źródłem zawieszania inicjalnego bufora; iOS wolniej reaguje na `auto` niż na `metadata` w naszym „native controls" wariancie (który i tak nie potrzebuje pełnego prebufferu, bo nie ma smart-buffering pipeline'u).
4. **Fallback po nieudanym tokenie** (`SecureMedia.tsx` ~412) ustawia `signedUrl = mediaUrl` — direct URL do purelife.info.pl. Jeśli VPS nie serwuje `Range` (206) lub odpowiedniego `Content-Type: video/mp4`, iPhone milczy. Brak sygnału do użytkownika ani admina.
5. **Brak walidacji przy uploadzie w `HealthyKnowledgeManagement.tsx`** — admin może wgrać `.mov` (HEVC), `.webm`, `.mkv` które Safari odmówi odtwarzać, i nikt tego nie zauważy do momentu skargi użytkownika z iPhone'a.
6. **`videoReadyTimeoutRef`** (fix E) po 8 s tylko pokazuje wideo, ale gdy dekoder padł — nadal nic nie widać, spinner znika, kontrolki zostają puste.

## Zmiany

### 1. `src/components/SecureMedia.tsx` — gałąź „native controls" (linie ~2234-2263)

- Dodać `useState<'ok'|'error'>` dla stanu odtwarzania w tej gałęzi (lokalnie, żeby nie ruszać ogromnej maszyny stanów restricted/secure).
- Zamienić `src={signedUrl}` na `<source src={signedUrl} type={detectedMime}>` z helperem `videoMime(url)` (jak w `NewsHubVideoPlayer.tsx` — spójny wzorzec w repo).
- Zmienić `preload` dla iOS/Safari na `metadata` niezależnie od hosta (VPS też) — szybszy start pierwszej klatki, mniejsze ryzyko utknięcia iOS na pełnym prefetchu.
- Dodać `onError` i `onLoadedMetadata`:
  - `onLoadedMetadata` → wyczyścić stan błędu, ustawić `videoReady=true`.
  - `onError` → wykryć `MediaError.code` (4 = SRC_NOT_SUPPORTED, 3 = DECODE), przełączyć w widok błędu z tekstem po polsku, ikoną i linkiem „Otwórz plik bezpośrednio" (analogicznie do `NewsHubVideoPlayer.tsx`).
- Dla iOS dodać atrybuty `x-webkit-airplay="allow"` i utrzymać istniejące `playsInline`/`webkit-playsinline`.
- Widok błędu zawiera krótką informację: „Ten plik wideo nie jest kompatybilny z Twoją przeglądarką (wymagany MP4 H.264 + AAC). Poproś administratora o ponowne wgranie w tym formacie."

### 2. `src/components/admin/HealthyKnowledgeManagement.tsx` — walidacja uploadu wideo

Przy wyborze pliku wideo:
- Odrzucić rozszerzenia `.webm`, `.mkv`, `.avi`, `.wmv`, `.flv` z jasnym komunikatem toast.
- Dla `.mov` i `.mp4`: użyć ukrytego `<video>` w Blobie do sprawdzenia `canPlayType('video/mp4; codecs="avc1.42E01E,mp4a.40.2"')` i `videoElement.videoWidth > 0` po `loadedmetadata`. Jeśli nie — pokazać ostrzeżenie: „Plik może być zapisany w HEVC/H.265 — Safari na iPhone go nie odtworzy. Skonwertuj do H.264 + AAC (np. HandBrake, ffmpeg)."
- Upload nie jest twardo blokowany (admin decyduje), ale ostrzeżenie ląduje w toast + w karcie materiału (metadanych) jako badge „Wymaga konwersji do H.264".

### 3. Nagłówki VPS — README/notatka dla administratora

Nie zmieniamy kodu VPS, ale dopisujemy krótką sekcję w istniejącym `.lovable/memory/` (governance nagrań), która wymaga:
- `Content-Type: video/mp4` dla `.mp4`,
- obsługi `Range` / kod 206 (Nginx: `mp4;` + `sendfile on;`),
- Faststart (moov atom z przodu — `ffmpeg -movflags +faststart`).
To pozwoli w przyszłości szybko odesłać się do standardu.

## Szczegóły techniczne

- Helper `videoMime(url: string)` importowany z `NewsHubVideoPlayer.tsx` lub wydzielony do `src/lib/videoMime.ts` (jednolinijkowy, zero zależności).
- Detekcja iOS już istnieje: `isIOSDevice()` z `videoBufferConfig.ts`.
- Widok błędu w SecureMedia to mały komponent inline w gałęzi native — nie ruszamy ścieżek `restricted`/`secure` używanych w Akademii i innych miejscach, żeby nie regresować szkoleń.
- Walidacja HEVC oparta o `MediaSource.isTypeSupported('video/mp4; codecs="hvc1"')` — jeśli plik ma poprawny kontener MP4 ale przeglądarka nie umie hvc1, ostrzegamy.

## Poza zakresem
- Transkodowanie po stronie serwera (wymagałoby ffmpeg na VPS/edge — inny projekt).
- Zmiany w ścieżce Akademii (`controlMode='restricted'`) — działa OK, ryzyko regresji.
- HLS/adaptive streaming — nadmiar dla obecnej skali.
