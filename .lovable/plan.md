
# Naprawa falszywie raportowanych tlumaczen

## Przyczyna

Funkcja `translateGenericBatch` (linia 1032-1034) w przypadku bledu AI zwraca tablice pustych obiektow `[{}, {}, ...]`. Nastepnie w petli upsert (np. linia 907-909):

```typescript
const { error } = await supabase.from('training_lesson_translations').upsert({
  lesson_id: batch[idx].id, language_code: target_language, ...translated[idx], // <-- {} pusty obiekt
  updated_at: new Date().toISOString()
}, { onConflict: 'lesson_id,language_code' });
if (error) errors++; else processedKeys++; // <-- liczy jako sukces!
```

Spread pustego obiektu `...{}` tworzy wiersz z `title=NULL, content=NULL`. Supabase nie zwraca bledu, wiec licznik `processedKeys` rosnie. Toast pokazuje "Przetlumaczono 20 kluczy" mimo ze zadne tlumaczenie nie zostalo zapisane.

## Rozwiazanie

Dodac walidacje przed upsertem - sprawdzic czy przetlumaczony obiekt zawiera przynajmniej jedno wypelnione pole. Jesli nie, policzyc jako blad i nie zapisywac pustego wiersza.

## Zmiany techniczne

### `supabase/functions/background-translate/index.ts`

**1. Helper do walidacji (nowa funkcja)**

```typescript
function hasTranslatedContent(obj: any, fields: string[]): boolean {
  return fields.some(f => obj[f] && typeof obj[f] === 'string' && obj[f].trim() !== '');
}
```

**2. processTrainingJob - moduly (linie 890-894)**

Zmiana z:
```typescript
const { error } = await supabase.from('training_module_translations').upsert({
  module_id: batch[idx].id, language_code: target_language, ...translated[idx], updated_at: new Date().toISOString()
}, { onConflict: 'module_id,language_code' });
if (error) errors++; else processedKeys++;
```

Na:
```typescript
if (!hasTranslatedContent(translated[idx], ['title', 'description'])) {
  errors++;
  console.warn(`Empty translation for module ${batch[idx].id}`);
} else {
  const { error } = await supabase.from('training_module_translations').upsert({
    module_id: batch[idx].id, language_code: target_language, ...translated[idx], updated_at: new Date().toISOString()
  }, { onConflict: 'module_id,language_code' });
  if (error) errors++; else processedKeys++;
}
```

**3. processTrainingJob - lekcje (linie 907-909)**

Analogiczna zmiana z walidacja pol `['title', 'content']`.

**4. processKnowledgeJob (linie 943-946)**

Walidacja pol `['title', 'description']`.

**5. processHealthyKnowledgeJob (linie 980-983)**

Walidacja pol `['title', 'description']`.

**6. processCMSJob - items (linie 430-460) i sections (linie 505-540)**

Walidacja analogiczna (dla items: `['title']`, dla sections: `['title']`).

## Dodatkowe: wyczyscic istniejace puste rekordy

Po wdrozeniu poprawki, jednorazowo usunac puste wiersze z tabel, zeby "Tlumacz AI" mogl je ponownie przetworzyc:

```sql
DELETE FROM training_lesson_translations WHERE title IS NULL AND content IS NULL;
DELETE FROM training_module_translations WHERE title IS NULL AND description IS NULL;
DELETE FROM knowledge_resource_translations WHERE title IS NULL;
DELETE FROM healthy_knowledge_translations WHERE title IS NULL;
```

## Efekt

- Toast bedzie poprawnie raportowac ilosc **rzeczywiscie przetlumaczonych** kluczy
- Puste wiersze nie beda juz tworzone w bazie
- Po usunieciu pustych rekordow, ponowne klikniecie "Tlumacz AI" przetworzy brakujace lekcje

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/functions/background-translate/index.ts` | Dodac helper `hasTranslatedContent()` + walidacja w 6 miejscach przed upsertem |

## Migracja danych

| Typ | SQL |
|-----|-----|
| Czyszczenie pustych rekordow | DELETE z 4 tabel `*_translations` WHERE title IS NULL |
