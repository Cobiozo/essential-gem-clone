## Problem

W edytorze wydarzenia (Eventy → Płatne wydarzenia) pole **„URL banera"** jest tylko zwykłym polem tekstowym — można wkleić link, ale nie da się wgrać pliku z komputera. Dlatego nie udaje się dodać grafiki banera bezpośrednio z dysku.

## Rozwiązanie

Podmienić zwykły input na ujednolicony komponent **`ImageUploadInput`** (ten sam, którego używają inne edytory CMS — Hero, Testimonials, Products, partner pages itd.). Zapewnia on:

- Upload pliku z komputera (drag & drop + przycisk wyboru)
- Wklejenie URL jako alternatywę
- Podgląd grafiki
- Możliwość usunięcia
- Spójny wygląd z resztą panelu admina

Zgodne z memory `infrastructure/ui/image-upload-and-crop-standard` — wszystkie pola obrazów w CMS mają używać `ImageUploadInput`.

## Zakres zmian

**Plik:** `src/components/admin/paid-events/editor/EventMainSettingsPanel.tsx`

- Zaimportować `ImageUploadInput` z `@/components/partner-page/ImageUploadInput`
- Zastąpić blok pola `banner_url` (linie 153–161) komponentem uploadera, zachowując etykietę „URL banera / Grafika banera" i bindowanie do `formData.banner_url`

## Efekt dla użytkownika

W oknie edycji wydarzenia, w miejscu obecnego pola tekstowego pojawi się obszar uploadu — będzie można:
1. Przeciągnąć plik graficzny z komputera, lub
2. Kliknąć i wybrać plik, lub
3. Nadal wkleić zewnętrzny URL

Po wgraniu pojawi się miniatura, którą można usunąć i zastąpić nową.
