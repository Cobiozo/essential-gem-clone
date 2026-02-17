

# Zastosowanie tlumaczen dynamicznych tresci w widgetach dashboardu

## Problem

Tlumaczenia dynamicznych tresci (tytulow modulow szkoleniowych, zasobow wiedzy, materialow Zdrowa Wiedza) sa zapisane w bazie danych w tabelach `*_translations`, ale widgety na dashboardzie pobieraja dane bezposrednio z tabel zrodlowych i wyswietlaja polskie tytuly bez aplikowania tlumaczen.

Hooki do tlumaczen juz istnieja:
- `useTrainingTranslations` - uzywany na stronie /training
- `useKnowledgeTranslations` - uzywany na stronie /knowledge
- `useHealthyKnowledgeTranslations` - uzywany na stronie /zdrowa-wiedza

Ale NIE sa uzywane w widgetach dashboardu.

## Zakres zmian

### 1. TrainingProgressWidget.tsx

**Problem**: Pobiera `training_modules.title` i wyswietla bez tlumaczenia (linia 117, 184).

**Rozwiazanie**: Po pobraniu modulow, doladowac tlumaczenia z `training_module_translations` dla aktualnego jezyka i zastapic tytuly.

- Dodac import `useLanguage`  (juz jest)
- Po pobraniu modulow, pobrac tlumaczenia z `training_module_translations` dla `language`
- Zastosowac przetlumaczone tytuly w `modulesWithProgress`

### 2. ResourcesWidget.tsx

**Problem**: Pobiera `knowledge_resources.title` i wyswietla bez tlumaczenia (linia 148).

**Rozwiazanie**: Po pobraniu zasobow, doladowac tlumaczenia z `knowledge_resource_translations`.

- Dodac pobieranie tlumaczen z `knowledge_resource_translations` po zaladowaniu zasobow
- Zastosowac przetlumaczone tytuly

### 3. HealthyKnowledgeWidget.tsx

**Problem**: Pobiera `healthy_knowledge.title` bez tlumaczenia (linia 117). Dodatkowo ma hardcoded polskie stringi:
- "Zdrowa Wiedza" (linie 62, 85)
- "Zobacz wszystkie" (linia 93)
- "Wyrosnione materialy edukacyjne" (linia 97)
- "Nowe" (linia 123)

**Rozwiazanie**:
- Dodac `useLanguage` i `useHealthyKnowledgeTranslations`
- Zastosowac przetlumaczone tytuly materialow
- Zamienic hardcoded stringi na `t()` z fallbackami

## Podejscie techniczne

Zamiast kopiowac logike tlumaczen, mozna:

**Opcja A** (prosta): W kazdym widgecie po pobraniu danych zrodlowych, pobrac rowniez rekordy z odpowiedniej tabeli `*_translations` i podmenic tytuly inline.

**Opcja B** (z hookami): Uzyc istniejacych hookow (`useTrainingTranslations`, `useKnowledgeTranslations`, `useHealthyKnowledgeTranslations`) - wymaga dopasowania typow danych.

Wybior: **Opcja A** - jest prostsza, nie wymaga konwersji typow, i widgety pobieraja ograniczone dane (limit 3-4 rekordy).

Przyklad dla TrainingProgressWidget:
```typescript
// Po pobraniu modulesData, pobierz tlumaczenia
if (language !== 'pl' && modulesData?.length) {
  const { data: translations } = await supabase
    .from('training_module_translations')
    .select('module_id, title')
    .eq('language_code', language)
    .in('module_id', modulesData.map(m => m.id));
  
  const transMap = new Map(translations?.map(t => [t.module_id, t.title]) || []);
  // Zastosuj w mapowaniu modulesWithProgress
  // title: transMap.get(mod.id) || mod.title
}
```

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/TrainingProgressWidget.tsx` | Pobieranie i aplikowanie tlumaczen tytulow modulow |
| `src/components/dashboard/widgets/ResourcesWidget.tsx` | Pobieranie i aplikowanie tlumaczen tytulow zasobow |
| `src/components/dashboard/widgets/HealthyKnowledgeWidget.tsx` | Pobieranie i aplikowanie tlumaczen + zamiana hardcoded PL na t() |
