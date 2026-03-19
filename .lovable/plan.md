

# Plan: Naprawa cropu + wybór kształtu przycinania

## Dwa problemy do rozwiązania

### A. Bug: obraz nie jest uploadowany
`createImage()` w `cropImage.ts` ustawia `crossOrigin = 'anonymous'` na blob URL — przeglądarka blokuje canvas. Naprawa: ustawiać `crossOrigin` tylko dla zdalnych URL.

### B. Nowa funkcja: wybór kształtu przycinania
Dodać selektor kształtu w dialogu cropu. Użytkownik wybiera kształt przed zatwierdzeniem.

## Dostępne kształty

| Kształt | `aspect` | `cropShape` | Opis |
|---------|----------|-------------|------|
| Poziomy 16:9 | `16/9` | `rect` | Domyślny, baner |
| Poziomy 4:3 | `4/3` | `rect` | Klasyczny poziomy |
| Pionowy 9:16 | `9/16` | `rect` | Stories, portret |
| Pionowy 3:4 | `3/4` | `rect` | Portret klasyczny |
| Kwadrat | `1` | `rect` | Instagram, avatar |
| Koło | `1` | `round` | Avatar okrągły |
| Owal poziomy | `16/9` | `round` | Elipsa pozioma |
| Owal pionowy | `9/16` | `round` | Elipsa pionowa |
| Dowolny | `undefined` | `rect` | Swobodne proporcje |

`react-easy-crop` natywnie obsługuje `cropShape: 'rect' | 'round'` — koło i owal uzyskujemy przez `round` + odpowiedni `aspect`.

## Zmiany

### 1. `src/lib/cropImage.ts`
- Naprawić `crossOrigin` — warunkowe ustawienie tylko dla http/https URL
- Dodać parametr `shape: 'rect' | 'round'` do `getCroppedImg`
- Dla `round` — po narysowaniu prostokątnego cropu zastosować eliptyczny clip path na canvas (przezroczyste tło, output PNG)

### 2. `src/components/partner-page/ImageUploadInput.tsx`
- Dodać stan `cropShape` i `aspect` z predefiniowanymi kształtami
- Wyświetlić rząd przycisków/chipów z ikonami kształtów nad cropperem
- Przekazać `cropShape` do `<Cropper>` i do `getCroppedImg`
- Dla kształtów round — upload jako `image/png` (przezroczystość)

## UI w dialogu

```text
┌─────────────────────────────────┐
│  Pozycjonowanie zdjęcia         │
│                                 │
│  [▬] [▮] [□] [○] [⬭] [⬯] [↔]  │  ← przyciski kształtów
│  ┌───────────────────────────┐  │
│  │      Cropper              │  │
│  └───────────────────────────┘  │
│  Zoom [────────●──────]         │
│           [Anuluj] [Zatwierdź]  │
└─────────────────────────────────┘
```

## Pliki

| Plik | Zmiana |
|------|--------|
| `src/lib/cropImage.ts` | Fix crossOrigin + elliptical clip dla round shapes |
| `src/components/partner-page/ImageUploadInput.tsx` | Selektor kształtu + przekazanie do croppera i getCroppedImg |

