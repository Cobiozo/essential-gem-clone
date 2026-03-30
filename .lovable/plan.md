

## Zakładka "Testymoniale" w Zdrowej Wiedzy

### Podejście
Wykorzystać istniejące pole `category` w tabeli `healthy_knowledge`. Dodać "Testymoniale" jako nową kategorię i wprowadzić system zakładek (tabs) na stronie użytkownika, oddzielając testymoniale od reszty materiałów.

### Zmiany

**1. Typy — `src/types/healthyKnowledge.ts`**
- Dodać `'Testymoniale'` do tablicy `HEALTHY_KNOWLEDGE_CATEGORIES`

**2. Strona użytkownika — `src/pages/HealthyKnowledge.tsx`**
- Dodać state `activeTab`: `'materials'` | `'testimonials'`
- Nad wyszukiwarką dodać dwie zakładki (Tabs): **"Materiały"** i **"Testymoniale"**
- Filtrować materiały wg zakładki:
  - "Materiały" → wszystko oprócz kategorii "Testymoniale"
  - "Testymoniale" → tylko kategoria "Testymoniale"
- Ukryć filtr kategorii w zakładce Testymoniale (bo jest tylko jedna)
- W zakładce Testymoniale zmienić podtytuł na np. "Opinie i efekty kuracji produktami Eqology"
- Pusta lista w Testymonialach: osobna ikona (Star) i tekst "Brak testymoniali"

**3. Admin — `src/components/admin/HealthyKnowledgeManagement.tsx`**
- Kategoria "Testymoniale" już będzie dostępna automatycznie dzięki zmianie w typach
- Dodać oznaczenie Badge "Testymonial" przy materiałach z tą kategorią w liście admina, żeby były łatwo rozpoznawalne

### Szczegóły techniczne

Zakładki (fragment strony użytkownika):
```tsx
<Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'materials' | 'testimonials')}>
  <TabsList>
    <TabsTrigger value="materials">Materiały</TabsTrigger>
    <TabsTrigger value="testimonials">Testymoniale</TabsTrigger>
  </TabsList>
</Tabs>
```

Filtrowanie:
```tsx
const filteredMaterials = translatedMaterials.filter(m => {
  const isTestimonial = m.category === 'Testymoniale';
  if (activeTab === 'testimonials' && !isTestimonial) return false;
  if (activeTab === 'materials' && isTestimonial) return false;
  // ... reszta filtrów bez zmian
});
```

Dodawanie testymoniali odbywa się tą samą ścieżką co materiały — admin wybiera kategorię "Testymoniale" w formularzu. Nie trzeba osobnego formularza.

Zmiana dotyczy 3 plików, bez migracji bazy danych.

