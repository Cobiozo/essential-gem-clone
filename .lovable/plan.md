

# Plan: Pozycjonowanie zdjęcia przed zatwierdzeniem

## Cel
Po wybraniu pliku z urządzenia partner widzi podgląd z możliwością przesunięcia i przybliżenia zdjęcia (crop/position). Dopiero po kliknięciu "Zatwierdź" obraz jest przycinany i uploadowany do Supabase.

## Podejście
Użyć biblioteki `react-easy-crop` — lekka, mobilna, obsługuje pinch-to-zoom. Po crop generujemy Canvas z przyciętym fragmentem i uploadujemy wynikowy plik.

## Zmiany

### 1. Instalacja zależności
- `react-easy-crop` — komponent crop z drag & zoom

### 2. `src/components/partner-page/ImageUploadInput.tsx`
- Po wybraniu pliku zamiast natychmiastowego uploadu — zapisać plik do stanu jako `objectURL` i otworzyć modal/dialog cropu
- Wyświetlić `<Cropper>` z react-easy-crop (drag + zoom slider)
- Przycisk "Zatwierdź" → wygenerować przycięty obraz na Canvas → upload do Supabase
- Przycisk "Anuluj" → zamknąć dialog, nie uploadować

### 3. `src/lib/cropImage.ts` (nowy plik)
- Helper function: przyjmuje `imageSrc` + `croppedAreaPixels` → zwraca `Blob` przyciętego obrazu za pomocą Canvas API

## Przepływ UX

```text
[Wybierz plik] → [Dialog z podglądem]
                  ┌─────────────────────┐
                  │  Przeciągnij/zoom    │
                  │  ┌───────────────┐  │
                  │  │   obraz       │  │
                  │  └───────────────┘  │
                  │  [Zoom ────●────]   │
                  │  [Anuluj] [Zatwierdź]│
                  └─────────────────────┘
                         ↓ Zatwierdź
                  [Upload do Supabase]
```

## Pliki

| Plik | Zmiana |
|------|--------|
| `package.json` | + `react-easy-crop` |
| `src/lib/cropImage.ts` | Nowy — Canvas crop helper |
| `src/components/partner-page/ImageUploadInput.tsx` | Dodać crop dialog przed uploadem |

