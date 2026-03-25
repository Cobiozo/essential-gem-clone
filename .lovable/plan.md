
# Plan udoskonalenia Auto-Webinarów — ZREALIZOWANY ✅

## Faza 1 — Naprawy krytyczne ✅

### 1.1 RLS dla anon ✅
- Dodano polityki SELECT dla `anon` na `auto_webinar_config` i `auto_webinar_videos`

### 1.2 Autoplay policy ✅
- Video startuje `muted={true}`, overlay "Włącz dźwięk" po załadowaniu
- Po kliknięciu unmute, overlay znika i pojawiają się kontrolki playera

### 1.3 Obsługa błędów video ✅
- `onError` — komunikat + przycisk "Spróbuj ponownie"
- `onWaiting`/`onPlaying` — spinner podczas buforowania

### 1.4 Error state i retry w hookach ✅
- 3 próby z exponential backoff w `useAutoWebinarConfig` i `useAutoWebinarVideos`
- Stan `error` eksponowany do UI

## Faza 2 — Ulepszenia funkcjonalne ✅

### 2.1 Kontrolki playera ✅
- Nowy `AutoWebinarPlayerControls.tsx`: mute/unmute, suwak głośności, fullscreen
- Auto-hide po 3s bez ruchu myszy

### 2.2 Walidacja godzin ✅
- Blokada zapisu gdy `start_hour >= end_hour` z komunikatem toast
- Wizualne ostrzeżenie pod polami

### 2.3 Publiczna strona ✅
- Przekazuje `isGuest` do `AutoWebinarEmbed` dla trackingu

### 2.4 Optymalizacja timera ✅
- 10s interwał normalnie, 1s podczas countdown (≤300s)

## Faza 3 — Rozszerzenia ✅

### 3.1 Analityka oglądalności ✅
- Tabela `auto_webinar_views` z RLS
- Hook `useAutoWebinarTracking` — loguje join/leave/duration
- `sendBeacon` na `beforeunload` dla niezawodnego zapisu

### 3.2 Podgląd admina ✅
- Przycisk "Podgląd" w panelu admina, otwiera modal z playerem w trybie preview
- Ignoruje harmonogram, odtwarza pierwszy aktywny film
