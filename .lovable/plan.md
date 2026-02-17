
# Naprawa pustych tlumaczen dynamicznych tresci

## Problem

W tabeli `training_lesson_translations` istnieje 20 rekordow dla jezyka angielskiego (EN) z pustymi polami (`title = NULL`, `content = NULL`, `media_alt_text = NULL`). Edge function `background-translate` sprawdza jedynie **istnienie wiersza** w trybie "missing", a nie czy pola sa wypelnione. Dlatego przy kliknieciu "Tlumacz AI" system raportuje "Przetlumaczono 0 kluczy" - bo rekordy juz istnieja (choc sa puste).

## Rozwiazanie

Zmienic logike sprawdzania istniejacych tlumaczen w `background-translate/index.ts` we wszystkich czterech typach jobow (training, knowledge, healthy_knowledge, CMS). Zamiast sprawdzac samo istnienie wiersza, nalezy sprawdzic czy **glowne pole** (np. `title`) jest wypelnione.

## Zmiany techniczne

### `supabase/functions/background-translate/index.ts`

**1. processTrainingJob (linie 864-871)**

Zmiana z:
```typescript
const { data: existModT } = await supabase
  .from('training_module_translations')
  .select('module_id')
  .eq('language_code', target_language);
const { data: existLessT } = await supabase
  .from('training_lesson_translations')
  .select('lesson_id')
  .eq('language_code', target_language);
```

Na:
```typescript
const { data: existModT } = await supabase
  .from('training_module_translations')
  .select('module_id')
  .eq('language_code', target_language)
  .not('title', 'is', null);
const { data: existLessT } = await supabase
  .from('training_lesson_translations')
  .select('lesson_id')
  .eq('language_code', target_language)
  .not('title', 'is', null);
```

**2. processKnowledgeJob (linia 924)**

Dodac `.not('title', 'is', null)` do zapytania o istniejace tlumaczenia.

**3. processHealthyKnowledgeJob (linia 961)**

Dodac `.not('title', 'is', null)` do zapytania o istniejace tlumaczenia.

**4. processCMSJob (linie 321-323 i 355-359)**

Dodac `.not('title', 'is', null)` do zapytan o istniejace tlumaczenia (zarowno items jak i sections).

## Efekt

Po tej zmianie, klikniecie "Tlumacz AI" w trybie "missing" wykryje 20 lekcji (i ewentualne inne puste rekordy) jako brakujace i przetlumaczy je poprawnie.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/functions/background-translate/index.ts` | Dodac `.not('title', 'is', null)` w 5 zapytaniach o istniejace tlumaczenia (training modules, training lessons, knowledge, healthy knowledge, CMS items, CMS sections) |
