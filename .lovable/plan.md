

# Plan: Rozbudowa systemu sekcji do odwzorowania screena Pure Life

## Co brakuje vs screenshot

Porównując screenshot z obecnymi sekcjami:

| Element ze screena | Obecny stan | Co trzeba |
|---|---|---|
| Hero z produktami po prawej + pasek statystyk | Hero tylko centered z video bg | Dodać layout `split` (tekst+obraz obok) + `stats[]` |
| Sekcja partnera (imię, bio, zdjęcie, CTA) | `text_image` istnieje | Wystarczy użyć `text_image` — OK |
| Formularz kontaktowy | Brak | Nowy typ `contact_form` |
| Stopka z danymi firmy + social media | Brak (tylko static HTML) | Nowy typ `footer` |

## Zmiany

### 1. Rozszerzenie Hero — layout split + stats bar

**HeroSection.tsx** — dodanie wariantu `layout: 'split'`:
- `split`: tekst po lewej, obraz (`hero_image_url`) po prawej, pod spodem pasek statystyk
- `centered`: obecne zachowanie (video bg, tekst na środku)

Nowe pola config: `layout`, `hero_image_url`, `stats[]` (każdy: `icon`, `value`, `label`)

**HeroSectionEditor.tsx** — dodanie pól: select layout, URL obrazu hero, dynamiczna lista statystyk

### 2. Nowy typ: `contact_form`

Sekcja z formularzem kontaktowym (imię, email, telefon, przycisk wyślij). Dane config:
- `heading`, `fields[]` (label, placeholder, type), `submit_text`, `privacy_text`
- Formularz wysyła dane do edge function lub wyświetla toast (MVP)

Pliki:
- `src/components/partner-page/sections/ContactFormSection.tsx` — renderer
- `src/components/admin/template-sections/ContactFormEditor.tsx` — edytor admina

### 3. Nowy typ: `footer`

Stopka z danymi firmy, linkami, ikonami social media. Config:
- `company_name`, `address`, `phone`, `email`, `links[]` (text, url), `social[]` (platform, url)

Pliki:
- `src/components/partner-page/sections/FooterSection.tsx` — renderer
- `src/components/admin/template-sections/FooterSectionEditor.tsx` — edytor admina

### 4. Aktualizacja typów i rejestracji

- `partnerPage.ts` — dodać `contact_form` i `footer` do `TemplateElementType`
- `PartnerTemplateEditor.tsx` — dodać do `TYPE_LABELS`, `RICH_TYPES`, `SectionConfigEditor`
- `PartnerPage.tsx` — dodać case do switch renderera
- Oba pliki `index.ts` (sections + template-sections) — eksport nowych komponentów

### 5. Migracja SQL — szablon "Pure Life Classic"

INSERT nowego szablonu z sekcjami odwzorowującymi screenshot:
1. `header` — logo Pure Life + nav (Produkty, Biznes, O nas, Kontakt)
2. `hero` layout=split — "Zadbaj o zdrowie..." + obraz produktów + stats bar (+2000 klientów, +30 krajów, 25000 pobrań)
3. `text_image` — sekcja partnera (imię, bio, zdjęcie, CTA "Chcę dołączyć!")
4. `products_grid` — 3 produkty (Gold, Heart&Energy, Collagen) + formularz kontaktowy obok
5. `contact_form` — "Daj mi znać jeśli chcesz wiedzieć więcej"
6. `footer` — Pure Life Polska Sp. z o.o., dane kontaktowe, social media

### Pliki do zmiany/utworzenia

| Plik | Zmiana |
|---|---|
| `src/types/partnerPage.ts` | +2 typy w union |
| `src/components/partner-page/sections/HeroSection.tsx` | Layout split + stats |
| `src/components/partner-page/sections/ContactFormSection.tsx` | Nowy |
| `src/components/partner-page/sections/FooterSection.tsx` | Nowy |
| `src/components/partner-page/sections/index.ts` | +2 eksporty |
| `src/components/admin/template-sections/HeroSectionEditor.tsx` | +layout, hero_image_url, stats |
| `src/components/admin/template-sections/ContactFormEditor.tsx` | Nowy |
| `src/components/admin/template-sections/FooterSectionEditor.tsx` | Nowy |
| `src/components/admin/template-sections/index.ts` | +2 eksporty |
| `src/components/admin/PartnerTemplateEditor.tsx` | +2 typy w labels/switch |
| `src/pages/PartnerPage.tsx` | +2 case w switch |
| Migracja SQL | INSERT szablon "Pure Life Classic" |

