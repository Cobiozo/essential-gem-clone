

# Plan: Szablon "Eqology" — rozbudowany system sekcji landing page

## Obecny problem
Aktualny system ma tylko 4 typy elementów (`static`, `editable_text`, `editable_image`, `product_slot`). To za mało, żeby odwzorować bogaty landing page z screena (hero z wideo, kroki, timeline, social proof, FAQ, produkty, CTA).

## Rozwiązanie — nowe typy sekcji z ustrukturyzowanymi danymi

### Rozszerzenie `TemplateElement`
Dodanie pola `config: Record<string, any>` do `TemplateElement` oraz nowych typów:

| Typ | Opis | Pola config |
|-----|-------|-------------|
| `hero` | Hero z tłem wideo/obraz, nagłówki, CTA | `video_url`, `bg_image_url`, `headline`, `subheadline`, `description`, `badge_text`, `cta_primary` (text+url), `cta_secondary` (text+url), `bg_color` |
| `text_image` | Sekcja tekst + obraz/wideo obok siebie | `heading`, `items[]` (text + icon), `image_url`, `image_side`, `highlight_text`, `highlight_description`, `cta_text`, `cta_url` |
| `steps` | 3 kroki z ikonami | `heading`, `description`, `steps[]` (icon, title, description) |
| `timeline` | Oś czasu procesu | `heading`, `milestones[]` (month, title, icon, highlight) |
| `testimonials` | Karuzela opinii/social proof | `heading`, `cards[]` (name, image, before, after, label, description) |
| `products_grid` | Siatka produktów z CTA | `heading`, `columns[]` (name, subtitle, specs, image_url, cta_text) — linki zakupowe z partnera |
| `faq` | Akordeon pytań | `heading`, `items[]` (question, answer) |
| `cta_banner` | Baner CTA z ciemnym tłem | `heading`, `description`, `cta_text`, `cta_url`, `bg_color` |
| `header` | Pasek górny z logo i przyciskami | `logo_text`, `buttons[]` (text, url, variant) |

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/types/partnerPage.ts` | Dodanie `config` do `TemplateElement`, rozszerzenie union typów |
| `src/components/admin/PartnerTemplateEditor.tsx` | Nowe edytory per typ sekcji (formularze z polami config) |
| `src/components/admin/template-sections/` | **Nowy folder** — edytory: `HeroSectionEditor`, `StepsSectionEditor`, `TimelineSectionEditor`, `TestimonialsSectionEditor`, `FaqSectionEditor`, `CtaBannerEditor`, `TextImageSectionEditor`, `ProductsGridEditor`, `HeaderSectionEditor` |
| `src/pages/PartnerPage.tsx` | Nowe renderery per typ sekcji — zamiast hardkodowanych sekcji, dynamiczne renderowanie `template.map()` |
| `src/components/partner-page/sections/` | **Nowy folder** — renderery publiczne: `HeroSection`, `StepsSection`, `TimelineSection`, `TestimonialsSection`, `FaqSection`, `CtaBannerSection`, `TextImageSection`, `ProductsGridSection`, `HeaderSection` |
| Migracja SQL | INSERT szablonu "Eqology" z wypełnionym `template_data` JSON (12 sekcji) |

### Przykładowy szablon "Eqology" — 10 sekcji

1. **header** — Logo EQOLOGY + przyciski "Wypełnij ankietę", "KUP TERAZ"
2. **hero** — Wideo tło, "TESTUJ, NIE ZGADUJ.", opis, 2x CTA
3. **text_image** — Problem rynku (lista ❌) + statystyka "9/10 osób"
4. **steps** — "Jak działa test" — 3 kroki (Zamawiasz → Pobierasz → Wysyłasz)
5. **timeline** — Proces 6 miesięcy (4 punkty na osi)
6. **testimonials** — Social proof z kartami PRZED/PO
7. **products_grid** — 3 kolumny produktów (Srebrna, Złota, Zielona)
8. **faq** — 3 pytania z akordeonem
9. **cta_banner** — "Nie wiesz od czego zacząć?" + CTA ankieta
10. **static** — Stopka

### Logika renderowania publicznego

```text
PartnerPage.tsx
  └─ template.map(element => {
       switch(element.type) {
         case 'hero': return <HeroSection config={element.config} />
         case 'steps': return <StepsSection config={element.config} />
         case 'products_grid': return <ProductsGridSection config={...} productLinks={...} />
         ...
       }
     })
```

Dla `products_grid` — obrazki i nazwy z config szablonu (admin), linki zakupowe z `partner_product_links` (partner).

### Logika edytora admina

Każdy typ ma dedykowany formularz w `PartnerTemplateEditor`. Zamiast jednego `Textarea` na HTML, admin widzi strukturalne pola:
- Hero: pola na headline, subheadline, URL wideo, tekst CTA, kolor tła
- Steps: dynamiczna lista kroków (dodaj/usuń krok)
- FAQ: dynamiczna lista pytań (dodaj/usuń pytanie)
- Testimonials: dynamiczna lista kart opinii
- itd.

### Co się NIE zmienia
- Logika partnera (wybór szablonu, wpisywanie linków zakupowych) — bez zmian
- Zarządzanie dostępem w CMS — bez zmian
- Katalog produktów — bez zmian
- Hook `usePartnerPage` — minimalne zmiany (config w typie)

