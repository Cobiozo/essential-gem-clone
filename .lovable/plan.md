

# Plan: Wieloliniowe pola tekstowe + wyrównanie tekstu we wszystkich edytorach sekcji

## Cel
1. Zamienić wszystkie pola `Input` z treścią tekstową na `Textarea` (wieloliniowe, obsługa Enter)
2. Dodać opcję wyrównania tekstu (lewo/środek/prawo) jako globalną opcję w `SectionConfigEditor`
3. Zastosować `whiteSpace: pre-line` + `textAlign` w rendererach sekcji

## Zmiany w edytorach — Input → Textarea

Pola do zamiany (tylko pola z treścią tekstową, NIE pola URL, kolory, ikony, numeryczne):

| Edytor | Pola do zamiany na Textarea |
|--------|---------------------------|
| **HeroSectionEditor** | `headline`, `subheadline`, `badge_text`, `cta_primary.text`, `cta_secondary.text`, `partner_badge.text`, `partner_badge.subtitle` |
| **CtaBannerEditor** | `heading`, `cta_text` |
| **TextImageSectionEditor** | `partner_name`, `partner_subtitle`, `heading`, `highlight_text`, `highlight_description`, `cta_text`, item `text` |
| **StepsSectionEditor** | `heading`, `description`, step `title`, step `description` |
| **TimelineSectionEditor** | `heading`, milestone `title`, milestone `month` |
| **TestimonialsSectionEditor** | card `label`, card `description`, card `before`, card `after` |
| **FaqSectionEditor** | `heading` (answer już jest Textarea) |
| **ContactFormEditor** | `heading`, `subheading`, `submit_text`, `privacy_text` |
| **FooterSectionEditor** | `company_name`, `address`, `copyright_text` |
| **ProductsGridEditor** | `heading`, col `name`, col `subtitle`, col `description`, col `cta_text` |
| **ProductsWithFormEditor** | `heading`, `default_cta_text` |
| **HeaderSectionEditor** | nav button `text` |

Każdy Textarea: `rows={1}` dla krótkich pól, `rows={2}` dla opisów, `className="min-h-[36px] resize-y"`.

## Wyrównanie tekstu — globalna opcja

W **`SectionConfigEditor.tsx`** dodać Select z opcjami wyrównania tekstu:
- `left` — Do lewej
- `center` — Środek  
- `right` — Do prawej

Zapisywane jako `config.text_align`.

## Rendering — zastosowanie w sekcjach

W rendererach sekcji (`HeroSection`, `CtaBannerSection`, `TextImageSection`, `StepsSection`, `ContactFormSection`, `FooterSection`) dodać:
- `whiteSpace: 'pre-line'` na wszystkich elementach tekstowych
- `textAlign: config.text_align` z configa sekcji

## Pliki do zmian

| Plik | Zmiana |
|------|--------|
| 10 edytorów sekcji | Input → Textarea dla pól tekstowych |
| `SectionConfigEditor.tsx` | Dodać Select wyrównania tekstu |
| 6+ rendererów sekcji | Dodać `whiteSpace: pre-line` + `textAlign` |

