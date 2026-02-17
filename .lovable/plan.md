
# Naprawa tlumaczenia lekcji szkoleniowych - blad parsowania JSON

## Problem

Logi edge function pokazuja blad:
```
SyntaxError: Expected ',' or '}' after property value in JSON at position 4366
```

Funkcja `translateGenericBatch` wysyla **20 lekcji naraz** (BATCH_SIZE=20) w jednym wywolaniu AI. Tresc lekcji jest dluga (do ~7700 znakow), wiec laczny payload jest ogromny. AI zwraca uszkodzony JSON (np. niedokonczone stringi, brakujace przecinki), ktory nie moze byc sparsowany. Wszystkie 20 lekcji jest liczonych jako bledy.

## Rozwiazanie

1. **Zmniejszyc BATCH_SIZE dla lekcji z `content`** - uzyc mniejszego batch size (np. 3) dla lekcji, ktore zawieraja dlugi tekst. Moduly i inne krotkie elementy moga zostac z wiekszym batchem.

2. **Dodac retry z mniejszym batchem** - jesli parsowanie JSON sie nie uda, podzielic batch na polowe i ponowic probe.

3. **Dodac czyszczenie JSON** - bardziej agresywne czyszczenie odpowiedzi AI (np. obcinanie po ostatnim `]`, naprawianie typowych bledow).

## Zmiany techniczne

### `supabase/functions/background-translate/index.ts`

**1. Dodac maly batch size dla lekcji (stala)**
```typescript
const BATCH_SIZE = 20;
const LESSON_BATCH_SIZE = 3; // Mniejszy batch dla duzych tresci
```

**2. Zmienic petla lekcji (linia 922) z `BATCH_SIZE` na `LESSON_BATCH_SIZE`**
```typescript
for (let i = 0; i < lessToTranslate.length; i += LESSON_BATCH_SIZE) {
  const batch = lessToTranslate.slice(i, i + LESSON_BATCH_SIZE);
```

**3. Ulepszyc czyszczenie JSON w `translateGenericBatch` (linia 1056-1057)**

Dodac bardziej agresywne czyszczenie odpowiedzi AI:
- Szukac pierwszego `[` i ostatniego `]`
- Usunac trailing commas
- W razie bledu, sprobowac tlumaczyc po jednym elemencie (fallback)

**4. Dodac mechanizm retry z pojedynczymi elementami**

Jesli caly batch sie nie uda, przetlumaczyc kazdy element osobno (fallback 1-by-1):

```typescript
} catch (error) {
  console.error('Batch failed, trying one-by-one fallback...');
  // Fallback: translate each item individually
  const results = [];
  for (const item of items) {
    try {
      const single = await translateGenericBatch([item], fields, sourceLanguage, targetLanguage, apiKey);
      results.push(single[0]);
    } catch {
      results.push({});
    }
  }
  return results;
}
```

## Efekt

- Lekcje beda tlumaczone w batchach po 3 (zamiast 20), co drastycznie zmniejsza rozmiar JSON
- Jesli batch sie nie uda, kazda lekcja zostanie przetlumaczona osobno
- Lepsze czyszczenie JSON zapobiegnie bledowi parsowania

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `supabase/functions/background-translate/index.ts` | Dodac `LESSON_BATCH_SIZE=3`, uzyc go dla lekcji, ulepszyc czyszczenie JSON, dodac fallback 1-by-1 |
