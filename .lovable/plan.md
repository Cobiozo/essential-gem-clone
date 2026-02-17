
# Polaczenie tlumaczen dynamicznych z widokami uzytkownika + automatyzacja

## Co jest gotowe

- 4 tabele tlumaczen w bazie danych (training_module/lesson_translations, knowledge_resource_translations, healthy_knowledge_translations)
- 3 hooki frontendowe (useTrainingTranslations, useKnowledgeTranslations, useHealthyKnowledgeTranslations)
- Edge function `background-translate` obsluguje job_type: training, knowledge, healthy_knowledge
- Panel admin DynamicContentTranslation z reczna edycja i przyciskiem "Tlumacz AI"

## Co brakuje

1. **Hooki NIE SA podlaczone** do stron uzytkownika — Training.tsx, TrainingModule.tsx, KnowledgeCenter.tsx, HealthyKnowledge.tsx, HealthyKnowledgePlayer.tsx nie uzywaja tlumaczen
2. **Brak automatycznego tlumaczenia** przy dodawaniu nowej tresci (np. nowy modul szkoleniowy)
3. **Brak automatycznego tlumaczenia** przy dodaniu nowego jezyka globalnego

## Plan implementacji

### 1. Podlaczenie hookow do stron uzytkownika

Kazda strona zostanie zmodyfikowana aby uzywac odpowiedniego hooka tlumaczen z aktualnym jezykiem interfejsu:

**Training.tsx** — po pobraniu modulow, przepuscic je przez useTrainingTranslations (wymaga osobnego hooka bo Training.tsx nie pobiera lekcji, tylko moduly z przeliczonymi statystykami)

**TrainingModule.tsx** — po pobraniu modulu i lekcji, uzyc useTrainingTranslations do przetlumaczenia tytulu modulu, tytulow i tresci lekcji

**KnowledgeCenter.tsx** — juz istnieje useKnowledgeTranslations — podlaczyc go po fetchResources

**HealthyKnowledge.tsx** — uzyc useHealthyKnowledgeTranslations na pobranych materialach

**HealthyKnowledgePlayer.tsx** — uzyc useHealthyKnowledgeTranslations dla pojedynczego materialu

### 2. Nowa edge function: auto-translate-content

Nowa funkcja ktora automatycznie uruchamia tlumaczenie na WSZYSTKIE aktywne jezyki (poza pl) gdy:
- Admin doda nowy modul szkoleniowy, lekcje, zasob wiedzy, lub material Zdrowej Wiedzy
- Admin doda nowy jezyk globalny

Logika:
1. Przyjmuje parametry: `type` (training_module, training_lesson, knowledge_resource, healthy_knowledge, new_language), `item_id` (opcjonalnie), `language_code` (opcjonalnie)
2. Dla nowej tresci: pobiera wszystkie aktywne jezyki (poza pl), tworzy translation_jobs dla kazdego jezyka
3. Dla nowego jezyka: tworzy 4 translation_jobs (training, knowledge, healthy_knowledge, i18n) dla tego jezyka

### 3. Wyzwalacze w panelach administracyjnych

Dodanie wywolania `auto-translate-content` w istniejacych komponentach admina:
- Po zapisaniu nowego modulu szkoleniowego
- Po zapisaniu nowej lekcji
- Po dodaniu nowego zasobu wiedzy
- Po dodaniu nowego materialu Zdrowej Wiedzy
- Po dodaniu nowego jezyka w TranslationsManagement

Wywolanie bedzie asynchroniczne (fire-and-forget) z toastem informujacym "Automatyczne tlumaczenie w tle rozpoczete".

### 4. Obsluga nowego jezyka

Gdy admin doda nowy jezyk w TranslationsManagement:
- Automatycznie uruchomia sie tlumaczenie CALEJ tresci (i18n + CMS + training + knowledge + healthy_knowledge) na nowy jezyk
- Uzytkownik zobaczy toast z informacja o rozpoczeciu procesu

## Szczegoly techniczne

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/pages/Training.tsx` | Import i uzycie useTrainingTranslations (tylko moduly) |
| `src/pages/TrainingModule.tsx` | Import i uzycie useTrainingTranslations (modul + lekcje) |
| `src/pages/KnowledgeCenter.tsx` | Import i uzycie useKnowledgeTranslations |
| `src/pages/HealthyKnowledge.tsx` | Import i uzycie useHealthyKnowledgeTranslations |
| `src/pages/HealthyKnowledgePlayer.tsx` | Import i uzycie useHealthyKnowledgeTranslations |
| `src/components/admin/TranslationsManagement.tsx` | Wywolanie auto-translate po dodaniu jezyka |

### Pliki do utworzenia

| Plik | Opis |
|------|------|
| `supabase/functions/auto-translate-content/index.ts` | Edge function automatycznego tlumaczenia |

### Aktualizacja config.toml

Dodanie wpisu dla nowej edge function:
```text
[functions.auto-translate-content]
verify_jwt = false
```

### Schemat edge function auto-translate-content

Przyjmuje body:
```text
{
  "type": "training_module" | "training_lesson" | "knowledge_resource" | "healthy_knowledge" | "new_language",
  "item_id": "uuid" (opcjonalnie, dla nowej tresci),
  "language_code": "en" (opcjonalnie, dla nowego jezyka)
}
```

Dla `type = "new_language"`:
- Tworzy 5 translation_jobs: i18n, cms, training, knowledge, healthy_knowledge
- Kazdy job ma source_language=pl, target_language=nowy jezyk, mode=missing

Dla pozostalych typow:
- Pobiera wszystkie aktywne jezyki poza pl
- Dla kazdego jezyka wywoluje background-translate z odpowiednim job_type

### Wazne: Kompatybilnosc hookow z typami stron

Training.tsx definiuje wlasny interface `TrainingModule` z dodatkowymi polami (lessons_count, completed_lessons, total_time_minutes). Hook useTrainingTranslations wymaga typu z `@/types/training`. Rozwiazanie: stworzyc wrapper ktory tlumaczy tylko pola title/description na podstawie id, bez wymogu pelnego typu.

Alternatywnie: uzyc osobnego prostego useEffect ktory pobiera tlumaczenia modulow i podmienia title/description na listacie modulow. To bedzie prostsze niz zmiana typow.
