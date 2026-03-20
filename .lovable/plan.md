

# Plan: Rozbudowa edytora nagłówka i renderera HeaderSection

## Cel
Znacząco rozbudować edytor nagłówka (HeaderSectionEditor) o opcje stylowania: kolory tła/tekstu, czcionki, wyrównanie, rozmiary logo, padding, przezroczystość, border — oraz zaktualizować renderer HeaderSection, żeby te style aplikował.

## Zmiany

### 1. `HeaderSectionEditor.tsx` — rozbudowa pól edycji

Dodać nowe sekcje w fieldsetach:

**Sekcja „Styl nagłówka":**
- `ColorInput` — kolor tła (`bg_color`, domyślnie `#ffffff`)
- `ColorInput` — kolor tekstu (`text_color`, domyślnie `#000000`)
- `ColorInput` — kolor obramowania (`border_color`, domyślnie `#f3f4f6`)
- `Select` — czcionka logo (`logo_font`: Inter, Playfair Display, Montserrat, Poppins, Roboto, Lato)
- `Input` (number) — rozmiar logo tekstu w px (`logo_font_size`, domyślnie 20)
- `Select` — grubość czcionki logo (`logo_font_weight`: normal, medium, semibold, bold, extrabold)
- `Input` (number) — wysokość logo obrazu w px (`logo_height`, domyślnie 40)
- `Select` — wyrównanie nawigacji (`nav_align`: left, center, right)
- `Input` (number) — padding pionowy (`padding_y`, domyślnie 12)
- `Checkbox/Switch` — ukryj obramowanie (`hide_border`)
- `Slider/Input` — przezroczystość tła (`bg_opacity`, 0-1, domyślnie 1)

**Sekcja „Styl linków nawigacji":**
- `ColorInput` — kolor tekstu linków (`nav_text_color`)
- `ColorInput` — kolor hover linków (`nav_hover_color`)
- `Select` — rozmiar tekstu nawigacji (`nav_font_size`: xs, sm, base, lg)
- `Select` — czcionka nawigacji (`nav_font`: jak wyżej)
- `Select` — grubość czcionki nawigacji (`nav_font_weight`)

**Rozbudowa elementów nawigacji (per button):**
- `ColorInput` — kolor tła przycisku (`bg_color`)
- `ColorInput` — kolor tekstu przycisku (`text_color`)
- `ColorInput` — kolor obramowania przycisku (`border_color`)
- `Input` — border-radius (`border_radius`, domyślnie 8)

### 2. `HeaderSection.tsx` — obsługa nowych properties

Zaktualizować renderer aby czytał nowe config properties i aplikował je inline:
- `style={{ backgroundColor, color, borderColor, paddingBlock, fontFamily }}` na `<header>`
- Logo text: `style={{ fontSize, fontWeight, fontFamily }}`
- Logo image: `style={{ height }}`
- Nawigacja: wyrównanie, kolory, rozmiary czcionek
- Przyciski: indywidualne kolory tła/tekstu/border per button

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `HeaderSectionEditor.tsx` | Dodanie ~15 nowych pól stylowania w fieldsetach |
| `HeaderSection.tsx` | Obsługa nowych config properties w inline styles |

