

# Plan: Wyświetlanie obrazu w wybranym kształcie

## Problem
Po przycięciu zdjęcia w kształcie owalu, obraz jest uploadowany jako PNG z przezroczystością, ale na stronie wyświetla się w prostokątnym kontenerze. Przezroczystość PNG teoretycznie powinna zachować kształt, ale `drop-shadow-2xl` i brak jawnego tła mogą powodować wizualne problemy. Dodatkowo — jeśli tło sekcji nie jest jednolite, przezroczystość PNG nie wystarczy — potrzebny jest CSS clip.

## Rozwiązanie
Zapisywać informację o wybranym kształcie obok URL obrazu i stosować odpowiedni CSS `clip-path` / `border-radius` przy wyświetlaniu.

## Zmiany

### 1. `ImageUploadInput.tsx` — zwracać kształt razem z URL
Zmienić `onChange` callback, aby oprócz URL przekazywał informację o kształcie. Dwie opcje:
- **Prosta**: dołączyć kształt jako hash do URL, np. `url#shape=oval_h`
- **Lepsza**: zmienić interfejs `onChange` na `(url: string, shape?: string)`

Wybór: opcja z rozszerzonym `onChange(url, shape)` — czystsza.

### 2. Edytor (`PartnerPageEditor.tsx` / `EditableWrapper.tsx`)
Zapisywać `hero_image_shape` w konfiguracji bloku obok `hero_image_url`.

### 3. `HeroSection.tsx` — wyświetlanie z kształtem
Odczytać `hero_image_shape` z config i zastosować odpowiedni CSS:

| Kształt | CSS na `<img>` |
|---------|---------------|
| `circle` | `border-radius: 50%` + `object-cover` + `aspect-square` |
| `oval_h` | `border-radius: 50%` + `object-cover` + `aspect-video` |
| `oval_v` | `border-radius: 50%` + `object-cover` + `aspect-[9/16]` |
| `square` | `aspect-square` + `object-cover` |
| domyślny | bez zmian (`object-contain`) |

### 4. `TextImageSection.tsx` — analogicznie
Jeśli ten komponent też korzysta z `ImageUploadInput`, dodać tę samą logikę kształtu.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/partner-page/ImageUploadInput.tsx` | Rozszerzyć `onChange` o parametr `shape` |
| `src/components/partner-page/PartnerPageEditor.tsx` | Zapisywać `hero_image_shape` w config bloku |
| `src/components/partner-page/EditableWrapper.tsx` | Przekazywać `shape` z `ImageUploadInput` do konfiguracji |
| `src/components/partner-page/sections/HeroSection.tsx` | Stosować CSS kształtu na hero image |
| `src/components/partner-page/sections/TextImageSection.tsx` | Stosować CSS kształtu na image (jeśli dotyczy) |

