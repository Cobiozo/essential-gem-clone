

# Plan: System kompozycyjnych elementów w sekcjach z drag-and-drop

## Problem
Obecne sekcje (Hero, TextImage, Steps itd.) mają **sztywny zestaw elementów** — nagłówek, opis, CTA, badge. Administrator nie może dodać dodatkowego bloku tekstu, obrazu, przycisku czy rozdzielacza wewnątrz sekcji. Brakuje też możliwości zmiany kolejności elementów wewnątrz sekcji.

## Rozwiązanie
Dodać system **kompozycyjnych pod-elementów** (`inner_elements`) do każdej sekcji. Administrator będzie mógł dodawać, usuwać i przeciągać (zmiana kolejności) elementy wewnątrz sekcji. Każdy element będzie miał rozbudowane opcje stylowania.

## Architektura

### Nowy typ: `InnerElement`
```text
InnerElement {
  id: string
  type: 'heading' | 'text' | 'image' | 'button' | 'badge' | 'divider' | 'spacer' | 'icon_list' | 'video'
  content: Record<string, any>   // type-specific data
  style: {
    font_family?: string         // Inter, Playfair Display, Montserrat, etc.
    font_size?: string           // xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl
    font_weight?: string         // normal, medium, semibold, bold, extrabold
    text_align?: string          // left, center, right
    text_color?: string          // hex
    bg_color?: string            // hex
    padding?: string             // sm, md, lg, xl
    margin_top?: string          // 0, 2, 4, 6, 8, 12
    margin_bottom?: string       
    border_radius?: string       // none, sm, md, lg, full
    max_width?: string           // full, lg, md, sm
    opacity?: number
  }
}
```

### Zmiany w plikach

#### 1. `src/components/admin/template-sections/InnerElementEditor.tsx` (nowy)
Uniwersalny edytor pojedynczego pod-elementu. Wyświetla:
- **Dla heading**: text input, font_family, font_size, font_weight, text_align, text_color, whitespace (pre-line toggle)
- **Dla text**: textarea, font_family, font_size, text_align, text_color, max_width
- **Dla image**: ImageUploadInput, alt text, border_radius, max_width, object_fit
- **Dla button**: text, url, bg_color, text_color, border_radius, font_weight, icon select
- **Dla badge**: text, icon, bg_color, text_color, border_radius
- **Dla divider**: color, thickness, style (solid/dashed/dotted), max_width
- **Dla spacer**: height (px)
- **Dla icon_list**: items array [{icon, text}], icon_color
- **Dla video**: url, autoplay, controls, border_radius

Wspólna sekcja stylowania (accordion „Styl zaawansowany") z margin, padding, opacity.

#### 2. `src/components/admin/template-sections/InnerElementsList.tsx` (nowy)
Komponent listy pod-elementów z:
- Drag-and-drop reordering (dnd-kit `SortableContext` z `verticalListSortingStrategy`)
- Przycisk „+ Dodaj element" z Popover menu typów
- Każdy element ma: drag handle, nazwa typu, przycisk edycji (rozwija/zwija accordion), duplikuj, usuń
- Stan: `expandedId` — który element jest rozwinięty do edycji

#### 3. `src/components/admin/template-sections/InnerElementRenderer.tsx` (nowy)
Renderer pojedynczego elementu w podglądzie sekcji. Przyjmuje `InnerElement` i renderuje odpowiedni HTML z zastosowaniem inline styles z `element.style`.

#### 4. Aktualizacja edytorów sekcji (wszystkie)
Na dole każdego edytora (`HeroSectionEditor`, `TextImageSectionEditor`, `StepsSectionEditor`, `CtaBannerEditor`, `ContactFormEditor`, `FooterSectionEditor`, `FaqSectionEditor`, `TimelineSectionEditor`, `TestimonialsSectionEditor`) dodać:
```tsx
<fieldset className="border rounded-lg p-4 space-y-3">
  <legend>Dodatkowe elementy</legend>
  <InnerElementsList
    elements={config.inner_elements || []}
    onChange={(els) => update('inner_elements', els)}
  />
</fieldset>
```

#### 5. Aktualizacja rendererów sekcji
W każdym rendererze (HeroSection, TextImageSection, itd.) na końcu treści sekcji dodać:
```tsx
{config.inner_elements?.length > 0 && (
  <div className="space-y-0">
    {config.inner_elements
      .sort((a, b) => a.position - b.position)
      .map(el => <InnerElementRenderer key={el.id} element={el} />)}
  </div>
)}
```

#### 6. Rozbudowa istniejących pól (typography controls)
Dodać do **HeroSectionEditor** pola stylowania nagłówka:
- `headline_font` (select czcionek)
- `headline_font_size` (select: 3xl, 4xl, 5xl, 6xl)
- `headline_font_weight` (select)
- `headline_text_align` (left/center/right)
- `description_font_size`, `description_text_align`

Analogicznie do **CtaBannerEditor** i **TextImageSectionEditor** — pola typografii nagłówka i opisu.

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `InnerElementEditor.tsx` | NOWY — edytor pojedynczego pod-elementu ze stylami |
| `InnerElementsList.tsx` | NOWY — lista z DnD, dodawanie/usuwanie elementów |
| `InnerElementRenderer.tsx` | NOWY — renderer pod-elementu w podglądzie |
| `HeroSectionEditor.tsx` | Dodać typography controls + `<InnerElementsList>` |
| `TextImageSectionEditor.tsx` | Dodać typography controls + `<InnerElementsList>` |
| `StepsSectionEditor.tsx` | Dodać `<InnerElementsList>` |
| `CtaBannerEditor.tsx` | Dodać typography + `<InnerElementsList>` |
| `FaqSectionEditor.tsx` | Dodać `<InnerElementsList>` |
| `TimelineSectionEditor.tsx` | Dodać `<InnerElementsList>` |
| `TestimonialsSectionEditor.tsx` | Dodać `<InnerElementsList>` |
| `ContactFormEditor.tsx` | Dodać `<InnerElementsList>` |
| `FooterSectionEditor.tsx` | Dodać `<InnerElementsList>` |
| `HeroSection.tsx` | Renderować `inner_elements` + obsługa headline typography |
| `TextImageSection.tsx` | Renderować `inner_elements` |
| `StepsSection.tsx` | Renderować `inner_elements` |
| Pozostałe renderery | Renderować `inner_elements` |

### Typy elementów w menu „Dodaj"

```text
📝 Nagłówek      — duży tekst z pełną kontrolą typografii
📄 Tekst         — akapit z formatowaniem
🖼️ Obraz         — z uploadem i zaokrągleniem
🔘 Przycisk      — CTA z kolorem i linkiem
🏷️ Badge         — mała etykieta z ikoną
➖ Rozdzielacz   — linia pozioma
📏 Odstęp        — pusty spacer (konfigurowalny px)
✅ Lista ikon    — punkty z ikonami (checkmarks etc.)
🎥 Wideo         — embed MP4
```

