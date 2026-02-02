
# Plan: Optymalizacja odtwarzania wideo w module Akademia

## Zdiagnozowane przyczyny zacinania się

### 1. Źródło wideo - serwer VPS (purelife.info.pl)
Wideo są hostowane na zewnętrznym serwerze VPS, nie na Supabase Storage. Ten serwer może mieć:
- Ograniczoną przepustowość (shared hosting Cyberfolks)
- Brak wsparcia dla "byte-range requests" (kluczowe dla streamingu)
- Brak kompresji/optymalizacji dla wideo

### 2. Obecna logika buforowania zbyt agresywna
Kod aktywuje spinner buforowania już po **2 sekundach** mikro-zacinki (smartBufferingDelayMs = 2000ms), co przy szybkim internecie i tak powoduje:
- Fałszywe "buffering" dla krótkich przerw w sieci
- Pauzowanie i wznawianie wideo (powoduje kolejne zacinki)
- Ciągły cykl pause→buffer→play

### 3. Smart buffering pauzuje wideo niepotrzebnie
Gdy wykryto "waiting", wideo jest **pauzowane** i czeka na bufor. Na szybkim internecie to powoduje niepotrzebne przerwy - przeglądarka sama mogłaby dogonić.

### 4. Brak HTTP Range Request hints
Element `<video>` nie ma atrybutu `preload="auto"` dla zewnętrznych URL - używa `metadata` co powoduje wolniejszy start.

---

## Proponowane rozwiązania

### Zmiana 1: Zwiększenie tolerancji na mikro-zacinki
Zwiększenie `smartBufferingDelayMs` z 2000ms do **3500ms** - pozwoli przeglądarce samodzielnie nadrobić krótkie opóźnienia bez interwencji.

```typescript
// videoBufferConfig.ts
smartBufferingDelayMs: 3500,  // Było 2000ms
```

### Zmiana 2: Inteligentniejsze wykrywanie buforowania
Dodanie sprawdzenia `readyState` przed aktywacją smart buffering - jeśli przeglądarka ma dane, nie przerywać odtwarzania.

```typescript
// SecureMedia.tsx - handleWaiting
bufferingTimeoutRef.current = setTimeout(() => {
  // Dodatkowe sprawdzenie - czy wideo ma już wystarczający bufor
  const bufferedAhead = getBufferedAhead(video);
  const minRequired = bufferConfigRef.current.minBufferSeconds * 0.5; // Połowa min bufora
  
  if (video.readyState >= 3 || bufferedAhead >= minRequired) {
    console.log('[SecureMedia] Skipping smart buffering - sufficient data available');
    return;
  }
  // ... reszta logiki
}, smartBufferingDelay);
```

### Zmiana 3: Opóźnienie wyświetlania spinnera (nie samego buforowania)
Spinner bufferingu pokazuje się natychmiast. Dodać **1.5s debounce** zanim pokaże się spinner, ale bez pauzowania wideo.

```typescript
// Nowy stan
const [showBufferingSpinner, setShowBufferingSpinner] = useState(false);
const spinnerTimeoutRef = useRef<NodeJS.Timeout>();

// W handleWaiting - opóźnić tylko UI, nie logikę
spinnerTimeoutRef.current = setTimeout(() => {
  if (!video.paused && video.readyState < 3) {
    setShowBufferingSpinner(true);
  }
}, 1500);

// W handleCanPlay - natychmiast ukryć spinner
clearTimeout(spinnerTimeoutRef.current);
setShowBufferingSpinner(false);
```

### Zmiana 4: Preload "auto" dla wszystkich wideo z VPS
Dla wideo z purelife.info.pl zmienić strategię preload na "auto" zamiast "metadata".

```typescript
// SecureMedia.tsx - element video
preload={signedUrl.includes('purelife.info.pl') ? 'auto' : bufferConfigRef.current.preloadStrategy}
```

### Zmiana 5: Zmniejszenie bufferingStateDelayMs
Zmniejszenie opóźnienia w `handleCanPlay` z 1200ms do **800ms** - szybsze wznowienie po mikro-zacinace.

```typescript
// videoBufferConfig.ts
bufferingStateDelayMs: 800,  // Było 1200ms
```

### Zmiana 6: Wyłączenie pauzowania dla dobrych połączeń
Gdy sieć jest dobra (4g/unknown), nie pauzować wideo podczas buforowania - pozwolić przeglądarce nadrobić w tle.

```typescript
// SecureMedia.tsx - handleWaiting
const shouldPauseForBuffering = isSlowNetwork() || getNetworkQuality() === '3g';

if (shouldPauseForBuffering && !video.paused) {
  wasPlayingBeforeBufferRef.current = true;
  video.pause();
  setIsSmartBuffering(true);
} else {
  // Dla dobrego internetu - tylko pokaż spinner, nie pauzuj
  setShowBufferingSpinner(true);
}
```

---

## Szczegółowa tabela zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `src/lib/videoBufferConfig.ts` | `smartBufferingDelayMs: 3500` | Większa tolerancja na mikro-zacinki |
| `src/lib/videoBufferConfig.ts` | `bufferingStateDelayMs: 800` | Szybsze wznowienie po buforowaniu |
| `src/components/SecureMedia.tsx` | Osobny stan dla spinnera z debounce | Spinner pojawia się dopiero po 1.5s |
| `src/components/SecureMedia.tsx` | Sprawdzenie bufora przed smart buffering | Nie przerywać gdy dane są dostępne |
| `src/components/SecureMedia.tsx` | Warunkowe pauzowanie tylko dla słabych sieci | Szybkie łącza nie są przerywane |
| `src/components/SecureMedia.tsx` | `preload="auto"` dla VPS | Szybszy start wideo |

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

---

## Oczekiwany rezultat

Po wdrożeniu:
- Mniej fałszywych spinnerów buforowania
- Płynniejsze odtwarzanie na szybkim internecie
- Wideo nie jest pauzowane dla krótkich przerw
- Spinner pojawia się tylko gdy rzeczywiście brakuje danych przez >1.5s
