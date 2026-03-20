

# Plan: Interaktywna Ankieta Zdrowotna — nowy typ sekcji `survey`

## Cel
Stworzyć nowy typ sekcji `survey` w systemie szablonów stron partnerskich. Sekcja renderuje interaktywny kwestionariusz krok-po-kroku (pytanie → odpowiedź → dalej → następne pytanie). Na końcu wyświetla rekomendację produktów. Przycisk CTA w `cta_banner` może linkować do ankiety przez anchor `#ankieta`.

## Przepływ ankiety (UX)

```text
[Pytanie 1: Płeć]  →  [Pytanie 2: Wiek]  →  [Pytanie 3: Wzrost]
→  [Pytanie 4: Waga]  →  [Pytanie 5: Aktywność fizyczna]
→  [Pytanie 6: Główne dolegliwości]  →  [Pytanie 7: Stosowane suplementy]
→  [Pytanie 8-12: dodatkowe pytania zdrowotne]
→  [Podsumowanie + Rekomendacja produktów]
```

Każdy krok: tytuł pytania, opcje do zaznaczenia (radio lub multi-select), przycisk "Dalej" / "Wstecz". Pasek postępu na górze. Na końcu — wynik z dopasowanymi produktami.

## Struktura danych (config sekcji)

```typescript
{
  heading: "Ankieta zdrowotna",
  subtitle: "Dopasuj suplementy do swoich potrzeb",
  bg_color: "#0a1628",
  text_color: "#ffffff",
  questions: [
    {
      id: "gender",
      question: "Jaka jest Twoja płeć?",
      type: "single",  // "single" | "multiple"
      options: [
        { label: "Kobieta", value: "female", tags: [] },
        { label: "Mężczyzna", value: "male", tags: [] }
      ]
    },
    {
      id: "age",
      question: "Ile masz lat?",
      type: "single",
      options: [
        { label: "18-30", value: "18-30", tags: ["young"] },
        { label: "31-50", value: "31-50", tags: ["middle"] },
        { label: "51+", value: "51+", tags: ["senior"] }
      ]
    },
    // ... kolejne pytania
  ],
  product_recommendations: [
    {
      tags: ["stawy", "senior"],       // jeśli użytkownik zebrał te tagi
      product_name: "Marine Collagen",
      description: "Kolagen morski wspierający stawy"
    }
  ],
  result_heading: "Twoje rekomendowane produkty",
  result_description: "Na bazie Twoich odpowiedzi dopasowaliśmy:"
}
```

Logika dopasowania: każda opcja odpowiedzi ma `tags[]`. Po zakończeniu ankiety zbierane są wszystkie tagi użytkownika → produkty z `product_recommendations` które mają pasujące tagi są wyświetlane.

## Nowe pliki i zmiany

### 1. Nowe pliki

| Plik | Opis |
|------|------|
| `src/components/partner-page/sections/SurveySection.tsx` | Renderer ankiety: stepper, pytania, nawigacja, wynik |
| `src/components/admin/template-sections/SurveySectionEditor.tsx` | Edytor: zarządzanie pytaniami, opcjami, tagami, rekomendacjami |

### 2. Modyfikowane pliki

| Plik | Zmiana |
|------|--------|
| `src/types/partnerPage.ts` | Dodać `'survey'` do `TemplateElementType` |
| `src/components/admin/template-preview/defaultSectionConfigs.ts` | Dodać default config + opcję w `SECTION_TYPE_OPTIONS` |
| `src/components/admin/template-sections/SectionConfigEditor.tsx` | Dodać `case 'survey'` |
| `src/components/admin/template-sections/index.ts` | Export `SurveySectionEditor` |
| `src/pages/PartnerPage.tsx` | Dodać `case 'survey'` w renderSection |
| `src/pages/TemplatePreviewPage.tsx` | Dodać `case 'survey'` w renderSection |

### 3. Default config z gotowymi pytaniami

Domyślna konfiguracja będzie zawierać ~10 gotowych pytań zdrowotnych (płeć, wiek, wzrost, waga, aktywność, dolegliwości, suplementy, dieta, sen, stres, cele zdrowotne) oraz przykładowe rekomendacje produktów powiązane z tagami.

## Szczegóły komponentów

### SurveySection.tsx
- Stan: `currentStep` (0..N), `answers: Record<string, string[]>`
- Progress bar na górze (procent ukończenia)
- Animacja przejścia między pytaniami (opacity/translate)
- Pytanie single-choice: klik = zaznacz, pytanie multiple: checkboxy
- Przyciski "Wstecz" / "Dalej" (Dalej aktywne tylko gdy jest odpowiedź)
- Ostatni ekran: zbierz tagi z wybranych opcji → filtruj `product_recommendations` → pokaż karty produktów
- Anchor ID domyślnie `ankieta`

### SurveySectionEditor.tsx
- Pola globalne: heading, subtitle, bg_color, text_color, result_heading, result_description
- Lista pytań (dodaj/usuń/reorder): każde pytanie ma `question`, `type` (single/multiple), listę opcji z `label`, `value`, `tags[]`
- Lista rekomendacji produktów: `tags[]`, `product_name`, `description`, `image_url`, `link`
- Wszystkie pola tekstowe jako Textarea

