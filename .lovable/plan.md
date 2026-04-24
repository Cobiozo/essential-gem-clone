## Diagnoza

**Problem 1 — "Dowolny" nie pozwala na ustawienie kadru**

Komponent kropujący (`react-easy-crop` w `src/components/partner-page/ImageUploadInput.tsx`) ma fundamentalne ograniczenie: gdy `aspect={undefined}` (tryb "Dowolny"), biblioteka **nie pokazuje przesuwalnej/skalowalnej ramki kadrowania** — pokazuje tylko cały obraz, a użytkownik może jedynie zoomować i przesuwać. Stąd wrażenie, że "nic nie da się ustawić". `react-easy-crop` z założenia nie obsługuje free-form drag-resize ramki.

**Problem 2 — Brak podglądu jak banner będzie wyglądał na stronie**

Banner wydarzenia w `src/components/paid-events/public/PaidEventHero.tsx` (linia 109) jest renderowany z **wymuszonym aspektem 21:9** (`aspect-[21/9] max-h-[520px]`) plus `object-cover object-center`. Niezależnie od tego, co użytkownik wykadruje, finalna prezentacja zawsze przycina obraz do 21:9. To dlatego tryb "Dowolny" jest mylący — nawet jak coś ustawi, strona i tak go przytnie.

## Plan naprawczy

### A. Usunąć tryb "Dowolny" dla bannera wydarzenia (źródło frustracji)

Tryb "Dowolny" działa technicznie tylko dla awatarów / okrągłych zdjęć. Dla bannera wydarzenia nie ma sensu — strona zawsze wymusza 21:9.

W `src/components/partner-page/ImageUploadInput.tsx`:
1. Dodać prop `allowedShapes?: string[]` (whitelist ID presetów). Gdy podany — filtrujemy `SHAPE_PRESETS`.
2. Dodać prop `defaultShape?: string` aby ustawić sensowny preset domyślny.

W `src/components/admin/paid-events/editor/EventGeneralPanel.tsx` (gdzie wybierany jest banner) przekazać:
```tsx
<ImageUploadInput 
  ... 
  allowedShapes={['h21_9', 'h16_9']} 
  defaultShape="h21_9"
/>
```

Dodać nowy preset `h21_9` (21:9) do `SHAPE_PRESETS`, bo banner publicznej strony używa właśnie tego stosunku — dzięki temu kadr w edytorze 1:1 odpowiada finalnemu wyglądowi.

### B. Dodać podgląd "Tak będzie wyglądać banner na stronie"

Pod kropperem dodać miniaturę renderowaną w aspekcie 21:9 z aktualnie kadrowanym wycinkiem (na żywo). Użyć tego samego CSS co publiczna strona (`aspect-[21/9] object-cover`) — co WIDAĆ to BĘDZIE.

Implementacja:
- Wykorzystać `croppedAreaPixels` aby na żywo generować preview przez `<canvas>` lub po prostu pokazać oryginalny obraz w masce 21:9 z translate/scale opartym na `crop` i `zoom` (lżejsze, bez canvasa).
- Najprostsze: pod kropperem dodać sekcję "Podgląd na stronie wydarzenia" — kontener `aspect-[21/9]` z gradientem na dole (jak w `PaidEventHero`) i tekstem zastępczym tytułu, żeby admin widział kompozycję końcową.

### C. Drobne usprawnienie UX dla pozostawionych presetów

Pozostawić tryb "Dowolny" tylko dla kontekstów innych niż banner (np. zdjęcia prelegentów, gdzie kadr nie jest finalnie wymuszany). 

## Pliki do edycji

1. `src/components/partner-page/ImageUploadInput.tsx`
   - Dodać preset `h21_9` (21:9 banner).
   - Dodać propsy `allowedShapes?: string[]` i `defaultShape?: string`.
   - Filtrować presety wg `allowedShapes`.
   - Dodać sekcję "Podgląd na stronie wydarzenia" (aspect 21:9) gdy aktywny preset to `h21_9` lub `h16_9` — pokazuje wykadrowany obraz z gradientem dolnym i przykładowym tytułem.

2. `src/components/admin/paid-events/editor/EventGeneralPanel.tsx`
   - Przy `ImageUploadInput` dla bannera dodać `allowedShapes={['h21_9', 'h16_9']}` oraz `defaultShape="h21_9"`.

## Efekt końcowy

- Admin wybierający banner widzi tylko sensowne presety (21:9 i 16:9), bez mylącego "Dowolny".
- Pod kropperem live-podgląd dokładnie tak jak na publicznej stronie wydarzenia (aspect 21:9 z gradientem).
- Przyciski "Zatwierdź" i "Anuluj" zachowują obecne położenie.