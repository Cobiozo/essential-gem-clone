

# Plan: Modernizacja Hero Split — identyczne odwzorowanie screena

## Analiza różnic (obecny kod vs screenshot)

| Element | Obecny stan | Screenshot |
|---------|------------|------------|
| Obraz hero (prawa strona) | W gridzie, z rounded corners, max-height, padding | Full-bleed — wypełnia całą prawą połowę, bez zaokrągleń, przylega do krawędzi |
| Gradient | Osobny overlay na bg_image | Gradient z lewej (solid navy) przechodzi w przezroczystość nad obrazem hero |
| CTA secondary | Ghost button (border, przezroczysty) | Wypełniony przycisk w kolorze beżowym/kremowym z ikoną ✔️ |
| Układ | Grid 50/50 z gap i padding | Lewa strona z tekstem ma padding, prawa strona to pełnoekranowy obraz |

## Zmiany

### 1. `HeroSection.tsx` — split layout rewrite

- **Obraz hero full-bleed**: Zamiast w gridzie, obraz będzie `absolute` pozycjonowany, wypełniający prawą połowę sekcji (`right-0, top-0, bottom-0, w-1/2`), `object-cover`, bez rounded corners.
- **Gradient overlay**: Gradient `bg-gradient-to-r` z `bg_color` (solid) po lewej do `transparent` po prawej — nakładany na obraz, zapewnia czytelność tekstu.
- **Lewa kolumna**: Tekst w `relative z-10`, zajmuje ~50% szerokości z paddingiem, bez grid — po prostu `max-w-[50%]`.
- **CTA secondary**: Obsługa nowych config properties:
  - `cta_secondary_bg_color` — kolor tła (np. `#f5e6c8` beż)
  - `cta_secondary_text_color` — kolor tekstu
  - Gdy `cta_secondary_bg_color` jest ustawiony, renderuje wypełniony przycisk zamiast ghost.

### 2. `HeroSectionEditor.tsx` — nowe pola

- Dodać w fieldset „CTA Drugie":
  - `ColorInput` dla `cta_secondary_bg_color` (kolor tła drugiego CTA)
  - `ColorInput` dla `cta_secondary_text_color` (kolor tekstu)
- Dodać opcję `hero_image_mode`: `contained` (obecny) vs `full-bleed` (nowy) — Select dropdown w sekcji obrazu hero.

### 3. Migracja SQL — update Pure Life Classic

Update config hero sekcji z:
- `hero_image_mode: "full-bleed"`
- `cta_secondary_bg_color: "#f0e4c9"` (beż ze screena)
- `cta_secondary_text_color: "#333333"`

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `HeroSection.tsx` | Przebudowa split layout: full-bleed image, gradient, nowy styl CTA secondary |
| `HeroSectionEditor.tsx` | Pola: hero_image_mode, cta_secondary_bg_color, cta_secondary_text_color |
| Migracja SQL | Update Pure Life Classic config |

