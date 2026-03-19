

# Plan: Ikona Play zamiast autoodtwarzania wideo w Hero

## Problem
Wideo w sekcji Hero odtwarza się automatycznie. Użytkownik chce widzieć miniaturkę z ikoną Play, a dopiero kliknięcie uruchamia odtwarzanie.

## Rozwiązanie

### Zmiana w `HeroSection.tsx` (linie 79-94, sekcja split layout):

1. Dodać stan `const [videoPlaying, setVideoPlaying] = useState(false)` i `useRef` dla elementu `<video>`.
2. Gdy `hero_video_url` jest ustawione i `videoPlaying === false`:
   - Renderować `<video>` z atrybutem `poster` (lub bez), bez `autoPlay`, z nałożoną ikoną Play (przycisk z ikoną `Play` z lucide-react).
   - Kliknięcie ikony Play → `setVideoPlaying(true)`, `videoRef.current.play()`.
3. Gdy `videoPlaying === true`:
   - Wideo odtwarza się normalnie (z `controls`), bez nakładki Play.

```tsx
// Struktura:
<div className="relative">
  <video ref={videoRef} src={hero_video_url} playsInline
    className="max-h-[500px] rounded-2xl drop-shadow-2xl object-cover" />
  {!videoPlaying && (
    <button onClick={handlePlay} className="absolute inset-0 flex items-center justify-center">
      <div className="bg-black/50 rounded-full p-4">
        <Play className="w-12 h-12 text-white fill-white" />
      </div>
    </button>
  )}
</div>
```

4. Dodać import `useState, useRef` z React oraz `Play` z lucide-react.

### Pliki do zmian:
| Plik | Zmiana |
|------|--------|
| `HeroSection.tsx` | Zamiana autoPlay na click-to-play z ikoną Play |

