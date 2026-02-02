
# Plan: Optymalizacja odtwarzania wideo w module Akademia

## ✅ WDROŻONO

### Zmiany w `src/lib/videoBufferConfig.ts`:
- `smartBufferingDelayMs`: 2000ms → **3500ms** (większa tolerancja dla mikro-zacinań)
- `bufferingStateDelayMs`: 1200ms → **800ms** (szybsze wznowienie po buforowaniu)
- Dodano nowy parametr `spinnerDebounceMs: 1500` (opóźnienie przed pokazaniem spinnera)

### Zmiany w `src/components/SecureMedia.tsx`:
1. **Debounced spinner** - spinner pojawia się dopiero po 1.5s zacinki, bez pauzowania wideo
2. **Sprawdzenie bufora przed smart buffering** - jeśli `readyState >= 3` lub bufor wystarczający, nie przerywać
3. **Warunkowe pauzowanie tylko dla wolnych sieci** - na szybkim internecie (4g/unknown) nie pauzować, tylko pokazać spinner
4. **Preload "auto" dla VPS** - wideo z `purelife.info.pl` używa `preload="auto"` zamiast "metadata"

---

## Oczekiwany rezultat

Po wdrożeniu:
- ✅ Mniej fałszywych spinnerów buforowania
- ✅ Płynniejsze odtwarzanie na szybkim internecie
- ✅ Wideo nie jest pauzowane dla krótkich przerw (na dobrym łączu)
- ✅ Spinner pojawia się tylko gdy rzeczywiście brakuje danych przez >1.5s

---

## Dodatkowe rekomendacje (poza kodem aplikacji)

### Serwer VPS (purelife.info.pl)
1. **Włączyć HTTP Range Requests** - kluczowe dla streamingu wideo
2. **Dodać nagłówki cache** - `Cache-Control: public, max-age=86400`
3. **Włączyć kompresję gzip/brotli** dla mniejszych plików
4. **Rozważyć CDN** (np. Cloudflare) przed VPS dla lepszego cachowania

### Optymalizacja plików wideo
1. **Konwersja do H.264/AAC** z web-optimized flag (`-movflags +faststart`)
2. **Bitrate max 3-4 Mbps** dla 1080p (obecnie mogą być za duże)
3. **Rozdzielczość adaptacyjna** (HLS) - ale wymaga większych zmian
