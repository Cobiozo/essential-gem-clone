

# Plan: Rozbudowa ikon (IconPicker) + pełna kontrola kart w sekcji Testimonials

## 1. Ikony — zamienić emoji na IconPicker w StepsSectionEditor

Aktualnie kroki w `StepsSectionEditor` mają pole emoji (`Input placeholder="Ikona (emoji)"`). Zamienić na komponent `IconPicker` z `@/components/cms/IconPicker` — ten sam, który jest już używany w wielu miejscach projektu. Daje dostęp do setek ikon Lucide z wyszukiwarką i kategoriami.

W rendererze `StepsSection` — renderować wybraną ikonę Lucide dynamicznie zamiast emoji.

**Pliki**: `StepsSectionEditor.tsx`, `StepsSection.tsx`

## 2. Karty Testimonials — opcje stylowania w edytorze

Dodać w `TestimonialsSectionEditor` sekcję "Styl kart" z kontrolkami:

| Opcja | Typ | Opis |
|-------|-----|------|
| `card_width` | Slider (180–400px) | Szerokość karty |
| `card_bg_color` | ColorInput | Kolor tła kart (nadpisuje gradient) |
| `card_text_color` | ColorInput | Kolor tekstu |
| `card_border_radius` | Slider (0–32px) | Zaokrąglenie rogów |
| `card_font_size` | Select (sm/base/lg) | Rozmiar czcionki |
| `avatar_size` | Slider (40–120px) | Rozmiar avatara |
| `auto_scroll` | Checkbox | Automatyczne przesuwanie |
| `auto_scroll_interval` | Slider (2–10s) | Interwał przesuwania |

**Plik**: `TestimonialsSectionEditor.tsx`

## 3. Renderer Testimonials — zastosować nowe opcje

W `TestimonialsSection.tsx`:
- Użyć `card_width`, `card_bg_color`, `card_text_color`, `card_border_radius`, `card_font_size`, `avatar_size` z configu
- Dodać `useEffect` z `setInterval` dla auto-scroll (jeśli `auto_scroll === true`) — scrolluje w prawo co X sekund, resetuje do początku po dotarciu do końca
- Jeśli `card_bg_color` jest ustawiony, nie stosować gradientu

**Plik**: `TestimonialsSection.tsx`

## Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `StepsSectionEditor.tsx` | Emoji input → IconPicker |
| `StepsSection.tsx` | Renderowanie ikony Lucide dynamicznie |
| `TestimonialsSectionEditor.tsx` | Dodać sekcję "Styl kart" z kontrolkami |
| `TestimonialsSection.tsx` | Zastosować styl z configu + auto-scroll |

