

# Plan: Obsługa wideo MP4 w miejscu obrazu hero (split layout)

## Problem
Pole `hero_image_url` w layoucie "split" renderuje tylko `<img>`. Nie ma możliwości wstawienia wideo MP4 zamiast obrazka po prawej stronie.

## Rozwiązanie

### 1. Nowe pole `hero_video_url` w konfiguracji
Dodać w edytorze osobne pole na wideo hero (obok istniejącego pola obrazu hero). Gdy `hero_video_url` jest ustawione — renderować `<video>` zamiast `<img>`.

### 2. `HeroSectionEditor.tsx` — dodać pole uploadu wideo
Pod polem "URL obrazu hero" dodać pole `hero_video_url` z komponentem `MediaUpload` (obsługuje wideo) lub zwykłym `Input` z labelem "URL wideo hero (prawa strona)". Dodać informację, że wideo ma priorytet nad obrazem.

### 3. `HeroSection.tsx` — renderować `<video>` gdy `hero_video_url` jest ustawione
W sekcji split layout (linie 79-87), zamienić logikę:

```tsx
{(hero_video_url || hero_image_url) && (
  <div className="flex justify-center">
    {hero_video_url ? (
      <video
        src={hero_video_url}
        autoPlay muted loop playsInline
        className="max-h-[500px] rounded-2xl drop-shadow-2xl object-cover"
      />
    ) : (
      <img src={stripShapeHash(hero_image_url)} ... />
    )}
  </div>
)}
```

### Pliki do zmian:
| Plik | Zmiana |
|------|--------|
| `HeroSection.tsx` | Dodać destructuring `hero_video_url`, renderować `<video>` gdy ustawione |
| `HeroSectionEditor.tsx` | Dodać pole `hero_video_url` (Input z labelem "URL wideo hero") pod polem obrazu hero |

