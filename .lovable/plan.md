

# Plan: Utworzenie szablonu "PureLifeCenter2026"

## Cel
Wstawić do bazy gotowy szablon z 5 sekcjami skonfigurowanymi identycznie jak na screenshocie. Szablon będzie natychmiast widoczny w panelu admina do edycji i przypisania partnerom.

## Szablon — 5 sekcji (template_data)

### 1. Header (`header`)
- Logo: tekst "Pure Life" + `logo_image_url` (placeholder)
- `nav_style: 'links'`
- 4 linki: Produkty, Biznes, O nas, Kontakt
- Edytowalne przez partnera: `logo_text`

### 2. Hero (`hero`, layout: `split`)
- `bg_image_url`: placeholder góry/jezioro
- `headline`: "Zadbaj o zdrowie i zbuduj dochód pomagając innym."
- `description`: "Zdrowie, energia, codzienna równowaga – z produktami, którym ludzie ufają"
- `cta_primary`: { text: "🌿 Chcę zobaczyć ofertę", url: "#products" }
- `cta_bg_color`: "#2d6a4f"
- `hero_image_url`: placeholder produkty
- 3 stats: +2000 klientów, +30 krajów, 25 000 pobranych materiałów
- Edytowalne: `cta_primary.url`

### 3. Partner intro (`text_image`)
- `bg_image_url`: placeholder tło
- `partner_name`: "Sebastian"
- `partner_subtitle`: "Twój partner w Pure Life"
- `heading`: "Zmieniamy zdrowie i życie ludzi na lepsze."
- 3 checkmark items z tekstami ze screenshota
- `cta_text`: "🌿 Chcę dołączyć!"
- `image_url`: placeholder zdjęcie partnera
- `image_side`: "right"
- Edytowalne: `partner_name`, `heading`, `image_url`, `cta_url`

### 4. Produkty + Formularz (`products_with_form`)
- `heading`: "Produkty, które ludzie kochają (i które działają)"
- 3 kolumny: Pure Arctic Oil Gold, Pure Arctic Oil Heart & Energy, Collagen Booster
- `form_config`: heading "Daj mi znać jeśli chcesz wiedzieć więcej", 3 pola (Imię, Email, Telefon), submit "Wyślij formularz", privacy text
- Edytowalne: `heading`

### 5. Footer (`footer`)
- `company_name`: "Pure Life Polska Sp. z o.o."
- `address`, `phone`, `email`
- Links: Warunki współpracy, Polityka prywatności
- Social: facebook, instagram, twitter, messenger
- `bg_color`: "#0a1628"

## Implementacja

Migracja SQL (`supabase/migrations/`) wstawia rekord do `partner_page_template` z:
- `name`: "PureLifeCenter2026"
- `description`: "Szablon Premium — Pure Life Center 2026"
- `is_active`: true
- `template_data`: pełny JSON z 5 elementami

Jeden plik migracji, zero zmian w kodzie React.

## Plik do utworzenia

| Plik | Opis |
|------|------|
| `supabase/migrations/20260319_seed_purelifecenter2026_template.sql` | INSERT szablonu z pełnym template_data |

