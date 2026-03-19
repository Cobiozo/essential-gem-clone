

# Plan: Redesign sekcji partnerskich na wzór screenshota

## Analiza screenshota — 6 sekcji

1. **Header** — logo Pure Life (obraz) + linki nav jako tekst (nie przyciski), białe tło
2. **Hero (split + bg_image)** — pełne tło (góry/jezioro), tekst lewy, produkty prawy, ciemnozielony CTA, statystyki z ikonami poniżej
3. **Partner intro (text_image)** — pełne tło zdjęcie, imię partnera + "Twój partner w Pure Life", nagłówek bold, bullet points z ✔️, zielony CTA, zdjęcie partnera po prawej
4. **Produkty + Formularz kontaktowy** — 3 karty produktów + formularz kontaktowy floating po prawej stronie (jeden zintegrowany widok)
5. **Footer** — ciemne tło, dane firmy, linki, social media ikony (kolorowe kółka)

## Zmiany w komponentach sekcji

### 1. `HeroSection.tsx` — wsparcie bg_image w layoucie split
- Dodać `bg_image_url` jako tło całej sekcji split (nie tylko centered)
- Tekst ma być ciemny (`text-foreground`) na jasnym tle LUB biały na ciemnym — sterowane kolorem `text_color`
- CTA: zaokrąglony, ciemnozielony, z ikoną (konfigurowalny `cta_icon`, `cta_bg_color`)
- Stats: ikony jako obrazki/emoji, białe tło karty, ciemny tekst

### 2. `HeaderSection.tsx` — linki nav jako tekst
- Dodać wariant `nav_style: 'links' | 'buttons'`
- Dla `links`: renderować `<nav>` z tekstowymi linkami `text-foreground hover:text-primary`
- Logo: większe, z obsługą obrazu

### 3. `TextImageSection.tsx` — sekcja partnera
- Dodać `bg_image_url` jako tło sekcji
- Dodać `partner_name`, `partner_subtitle` nad heading
- Zmienić ikonę itemów z emoji na ✔️ zieloną (konfigurowalny `item_icon_color`)
- CTA: zaokrąglony zielony przycisk z ikoną (jak w hero)
- Obraz po prawej: `object-cover` pełna wysokość, bez border-radius

### 4. `ProductsGridSection.tsx` — produkty z opisem
- Dodać `description` pod nazwą produktu
- CTA zmienić z "KUP TERAZ" na "Zobacz szczegóły" z ikoną `>`
- Karty: biały bg, subtelny cień, zaokrąglone

### 5. `ContactFormSection.tsx` — wariant floating/overlay
- Dodać `layout: 'standalone' | 'floating'`
- Floating: renderowana jako karta z ciemnym tłem, białym tekstem, nakładana na sekcję produktów
- Przycisk submit: ciemnozielony z ikoną `>`

### 6. Nowy typ sekcji `products_with_form`
- Zamiast osobnych sekcji produkty + formularz, dodać nowy typ który renderuje oba obok siebie (3 produkty lewo, formularz prawo)
- Konfiguracja w edytorze: nagłówek produktów, kolumny produktów, + formularz kontaktowy embedded

### 7. `FooterSection.tsx` — social media jako kolorowe kółka
- Dodać obsługę `twitter` / `messenger` do ikon
- Social: kolorowe kółka (fb niebieski, ig gradient, twitter niebieski, messenger fioletowy)
- Layout: 3 kolumny — dane firmy | linki | social

### 8. Edytory admin — nowe pola
- `HeroSectionEditor`: pole `text_color`, `cta_bg_color`, `cta_icon`
- `HeaderSectionEditor`: select `nav_style`
- `TextImageSectionEditor`: pola `bg_image_url`, `partner_name`, `partner_subtitle`
- `ProductsGridEditor`: pole `description` w kolumnach
- `ContactFormEditor`: select `layout`
- Nowy `ProductsWithFormEditor` dla połączonej sekcji

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/partner-page/sections/HeroSection.tsx` | bg_image w split, text_color, zielony CTA, stats redesign |
| `src/components/partner-page/sections/HeaderSection.tsx` | nav_style links, większe logo |
| `src/components/partner-page/sections/TextImageSection.tsx` | bg_image_url, partner_name/subtitle, zielone checkmarki, CTA styl |
| `src/components/partner-page/sections/ProductsGridSection.tsx` | description, nowy styl kart, "Zobacz szczegóły" |
| `src/components/partner-page/sections/ContactFormSection.tsx` | layout floating, ciemne tło, styl |
| `src/components/partner-page/sections/FooterSection.tsx` | kolorowe social, messenger/twitter |
| **Nowy** `src/components/partner-page/sections/ProductsWithFormSection.tsx` | Produkty + formularz side-by-side |
| `src/components/partner-page/sections/index.ts` | Export nowej sekcji |
| `src/types/partnerPage.ts` | Dodać `products_with_form` do `TemplateElementType` |
| `src/pages/PartnerPage.tsx` | Obsługa nowego typu sekcji |
| `src/components/admin/template-sections/HeroSectionEditor.tsx` | Nowe pola config |
| `src/components/admin/template-sections/HeaderSectionEditor.tsx` | nav_style select |
| `src/components/admin/template-sections/TextImageSectionEditor.tsx` | bg_image_url, partner fields |
| `src/components/admin/template-sections/ProductsGridEditor.tsx` | description pole |
| `src/components/admin/template-sections/ContactFormEditor.tsx` | layout select |
| **Nowy** `src/components/admin/template-sections/ProductsWithFormEditor.tsx` | Edytor połączonej sekcji |
| `src/components/admin/template-sections/index.ts` | Export nowego edytora |

## Efekt
Admin tworzy szablon z sekcjami skonfigurowanymi identycznie jak na screenshocie. Każdy element (tło, tekst, CTA, zdjęcia produktów, formularz) jest edytowalny z poziomu admina. Partner personalizuje oznaczone pola (imię, zdjęcie, linki CTA).

