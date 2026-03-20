

# Plan: InnerElements w nagłówku + kafelek partnera w headerze

## Zmiany

### 1. `HeaderSectionEditor.tsx` — dodać sekcję „Dodatkowe elementy"
Na końcu edytora dodać fieldset z `<InnerElementsList>` (identycznie jak w pozostałych edytorach sekcji), importując go z `./InnerElementsList`.

### 2. `HeaderSectionEditor.tsx` — dodać opcję „Kafelek partnera w nagłówku"
Nowy fieldset z przełącznikiem `show_partner_badge` (Switch). Gdy włączony, kafelek partnera (z konfiguracji hero `partner_badge`) będzie renderowany w nagłówku obok logo, po prawej stronie tekstu partnera.

Dodatkowe pola konfiguracji:
- `partner_badge_style`: wariant wyświetlania (`compact` — jedna linia, `card` — z tłem i zaokrągleniem)
- `partner_badge_bg_color` — kolor tła kafelka w nagłówku
- `partner_badge_text_color` — kolor tekstu

### 3. `HeaderSection.tsx` — renderować inner_elements i partner badge
- Import `InnerElementRenderer` i renderowanie `config.inner_elements` pod głównym paskiem nagłówka (dodatkowy rząd pod logo+nav).
- Renderowanie kafelka partnera (`partnerName` + avatar) obok logo gdy `show_partner_badge` jest włączony. Kafelek wyświetla się jako kompaktowy element w rzędzie logo (po separatorze `|`), zastępując obecny prosty `| partnerName`.

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `HeaderSectionEditor.tsx` | Import InnerElementsList, dodać fieldset „Dodatkowe elementy" + fieldset „Kafelek partnera" z opcjami stylowania |
| `HeaderSection.tsx` | Import InnerElementRenderer, renderowanie inner_elements pod headerem + rozbudowany partner badge obok logo |

