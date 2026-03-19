

# Plan: Szablon Eqology Omega-3 Landing Page

## Podsumowanie

Stworzenie premium szablonu landing page "Eqology Omega-3" w systemie stron partnerskich. Szablon będzie dostępny w panelu admina w zakładce "Szablony" w sekcji "Strony partnerskie". Zawiera 10 sekcji (Hero, Problem, Skala, Jak to działa, Proces 6-miesięczny, Gwarancja, Social Proof, Produkty, FAQ, Footer). Partner widzi gotową stronę i wpisuje tylko swoje linki afiliacyjne pod produkty.

## Architektura

Zamiast tworzyć osobny system bazy danych, rozszerzamy istniejący `partner_page_template` o nowy format szablonu:

```text
partner_page_template.template_data (JSONB)
├── template_type: "eqology_omega3"  ← nowe pole identyfikujące szablon
├── sections[] ← tablica sekcji z treścią (edytowalną przez admina)
└── theme: { colors, fonts }
```

Publiczny renderer (`PartnerPage.tsx`) rozpoznaje `template_type` i renderuje odpowiedni komponent.

## Zakres zmian

### 1. Nowe pliki

| Plik | Opis |
|------|------|
| `src/components/partner-page/templates/EqologyTemplate.tsx` | Renderer publicznej strony — 10 sekcji ze stylami Scandinavian (Deep Sea Blue #1A365D, Gold #D4AF37, białe tła) |
| `src/components/admin/EqologyTemplateManager.tsx` | Panel admina — edycja treści sekcji szablonu (WYSIWYG teksty, URLe obrazków, wideo, FAQ items) |
| `src/components/partner-page/templates/eqology-sections/` | Komponenty sekcji: `HeroSection`, `ProblemSection`, `ScaleSection`, `HowItWorksSection`, `TimelineSection`, `GuaranteeSection`, `SocialProofSection`, `ProductCardsSection`, `FaqSection`, `FooterSurveySection` |

### 2. Modyfikowane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/admin/PartnerPagesManagement.tsx` | Dodanie 4. zakładki "Szablony" z komponentem `EqologyTemplateManager` |
| `src/pages/PartnerPage.tsx` | Rozpoznawanie `template_type` → delegowanie do `EqologyTemplate` zamiast obecnego renderera |
| `src/types/partnerPage.ts` | Nowe typy: `EqologyTemplateData`, `EqologySection`, `FaqItem`, `SocialProofItem`, `ProductCard` |

### 3. Brak zmian w bazie danych

Wykorzystujemy istniejącą tabelę `partner_page_template` (pole `template_data` JSONB). Nowy szablon to po prostu inny format JSON w tym samym polu. Produkty dalej korzystają z `product_catalog` + `partner_product_links`.

## Struktura szablonu Eqology (template_data JSONB)

```typescript
{
  template_type: "eqology_omega3",
  theme: {
    primaryColor: "#1A365D",    // Deep Sea Blue
    accentColor: "#D4AF37",     // Luminous Gold
    bgColor: "#FFFFFF",
    bgAlt: "#F8F9FA",
    fontFamily: "Inter"
  },
  sections: {
    hero: {
      title: "TESTUJ, NIE ZGADUJ.",
      subtitle: "Twoje zdrowie zasługuje na twarde dane.",
      description: "6-miesięczny proces...",
      bgImageUrl: "",
      ctaPrimaryText: "KUP TERAZ",
      ctaSecondaryText: "Wypełnij ankietę",
      ctaSecondaryUrl: "#survey"
    },
    problem: {
      title: "Większość ludzi suplementuje na ślepo.",
      items: ["Reklamy...", "Rekomendacje...", "Brak dowodów..."]
    },
    scale: {
      title: "9 na 10 osób ma niedobór Omega-3.",
      description: "..."
    },
    howItWorks: {
      title: "Jak to działa?",
      steps: [{ icon, title, description }],
      videoUrl: ""
    },
    timeline: {
      title: "Proces 6-miesięczny",
      milestones: [{ month, title, description }]
    },
    guarantee: {
      title: "0 ryzyka. Gwarancja satysfakcji.",
      description: "..."
    },
    socialProof: {
      title: "Wyniki mówią same za siebie",
      items: [{ name, beforeRatio, afterRatio }]
    },
    faq: {
      title: "Najczęściej zadawane pytania",
      items: [{ question, answer }]
    },
    footerSurvey: {
      title: "Nie wiesz od czego zacząć?",
      ctaText: "Wypełnij ankietę",
      ctaUrl: ""
    }
  }
}
```

## Sekcje szablonu — szczegóły renderowania

1. **Hero** — pełnoekranowy gradient Deep Sea Blue → biały, duży H1 (Inter Bold), 2 przyciski CTA (Gold filled + Ghost outline)
2. **Problem** — lista z czerwonymi ikonami ✕, białe tło
3. **Scale** — ciemna sekcja (#1A365D), biały tekst, duża statystyka "9/10"
4. **How it Works** — 3 kroki z ikonami w okręgach, wideo player
5. **Timeline** — pozioma oś czasu z 4 kamieniami milowymi (animacja przy scroll)
6. **Guarantee** — zielona ikona tarczy, jasne tło
7. **Social Proof** — karty Before/After z kolorowymi wskaźnikami (czerwony → zielony)
8. **Products** — karty 3 produktów (Silver, Gold, Green) z hover shadow, przycisk "KUP TERAZ" (Gold), akordeon składników; **linki dynamiczne** — jeśli partner ma `partner_product_links`, użyj ich, jeśli nie — domyślny link z `product_catalog`
9. **FAQ** — akordeon z pytaniami/odpowiedziami
10. **Footer/Survey** — ciemne tło #1A365D, biały tekst, CTA ankieta

## Co widzi partner w edytorze

Partner NIE edytuje treści ani designu. W swoim panelu "Moja Strona-Biznes Partner" widzi:
- Podgląd strony (link)
- Toggle aktywacji
- Lista produktów z katalogu → wkleja swoje linki afiliacyjne (istniejąca logika `PartnerPageEditor`)

## Co widzi admin w zakładce "Szablony"

- Formularz edycji treści każdej sekcji (tytuły, opisy, FAQ, social proof items)
- Upload obrazków/wideo
- Podgląd na żywo
- Przycisk "Zapisz szablon"

## Kolejność implementacji

1. Typy TypeScript (`EqologyTemplateData`)
2. Domyślne dane szablonu (JSON z polskimi tekstami Eqology)
3. 10 komponentów sekcji (renderery)
4. `EqologyTemplate.tsx` (główny renderer)
5. `EqologyTemplateManager.tsx` (edytor admina)
6. Integracja: zakładka w `PartnerPagesManagement`, routing w `PartnerPage.tsx`

