

# Plan: Zamiana pól URL obrazów na ImageUploadInput z uploadem plików

## Problem
Wszystkie pola obrazów w edytorach sekcji (HeroSectionEditor, TextImageSectionEditor, itd.) to zwykłe `<Input>` tekstowe — nie pozwalają na przesłanie pliku z komputera.

## Rozwiązanie
Zastąpić wszystkie pola `<Input>` obsługujące URL obrazów komponentem `ImageUploadInput` (już istniejący — z cropperem i uploadem do Supabase Storage).

## Zmiany w plikach

| Plik | Pola do zamiany |
|------|-----------------|
| `HeroSectionEditor.tsx` | `bg_image_url`, `hero_image_url`, `video_url` (zostaje Input — to wideo) |
| `TextImageSectionEditor.tsx` | `image_url`, `bg_image_url` |
| `HeaderSectionEditor.tsx` | `logo_image_url` |
| `TestimonialsSectionEditor.tsx` | `card.image` (zdjęcie osoby) |
| `ProductsGridEditor.tsx` | `col.image_url` (obraz produktu) |

Każdy `<Input value={...url} onChange={...} />` z polem obrazowym → `<ImageUploadInput value={...url} onChange={...} />`

## Szczegóły techniczne
- `ImageUploadInput` z `src/components/partner-page/ImageUploadInput.tsx` obsługuje upload + cropping + URL ręczny
- Dla pól w tablicach (stats icon_url, testimonials image, products image_url) — użyć wariantu `compact` aby nie zajmować za dużo miejsca
- Nie zmieniamy pola `video_url` — to nie jest obraz

