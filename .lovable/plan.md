

# Naprawa systemu tłumaczeń — błędy CMS

## Diagnoza

Wszystkie joby CMS utknęły w statusie `processing` z **dokładnie 40 błędami i 0 przetłumaczonych** elementów. Problem dotyczy WSZYSTKICH języków (de, en, it, es, fr, pt, no).

### Przyczyna 1: Zalew jednoczesnych jobów
`scheduled-translate-sync` o 3:00 AM tworzy joby dla **7 języków × 5 typów × 2 trybów = do 70 jobów** i odpala je WSZYSTKIE jednocześnie via `background-translate`. Każdy job wywołuje AI API, co powoduje masowy rate limiting (429).

### Przyczyna 2: Utknięte joby bez restartu
Gdy `background-translate` przekroczy `MAX_EXECUTION_TIME` (25s), zapisuje `status: 'processing'` i kończy działanie. Nic nie wznawia tych jobów — zostają w statusie `processing` na zawsze.

### Przyczyna 3: Brak norweskiego w mapie języków
`LANGUAGE_NAMES` nie zawiera `'no': 'Norwegian'`, więc AI dostaje surowy kod `no` zamiast nazwy języka.

### Dlaczego dokładnie 40 błędów?
`BATCH_SIZE = 20`. AI zwraca błąd (rate limit), `translateCMSItemsBatch` łapie wyjątek i zwraca `{}` dla każdego elementu. `hasTranslatedContent({}, ['title'])` = false → errors++ × 20 na batch. 2 batche × 20 = 40 błędów, potem timeout.

## Plan naprawy

### 1. `background-translate/index.ts` — naprawy

- **Dodać `'no': 'Norwegian'`** do `LANGUAGE_NAMES`
- **Timeout → status `failed`** zamiast `processing` — zmienić 3 miejsca (linie ~444, ~526, i globalny catch) aby przy timeout zapisywać `status: 'failed'` z `error_message: 'Timeout - retry needed'`
- **Zwiększyć opóźnienie między batchami** z 100ms na 1000ms dla CMS (duże payloady)
- **Lepszy retry w `aiRequest`** — zwiększyć backoff z 2s/4s na 5s/15s

### 2. `scheduled-translate-sync/index.ts` — sekwencyjne przetwarzanie

- Dodać **opóźnienie 3s** między tworzeniem kolejnych jobów (`await new Promise(r => setTimeout(r, 3000))`)
- **Nie tworzyć nowego joba jeśli istnieje aktywny** (pending/processing) dla tego samego `job_type + target_language`
- Ograniczyć do **max 2 jobów jednocześnie** na język

### 3. `translate-content/index.ts` — dodać `'no': 'Norwegian'`

### 4. Migracja SQL — wyczyścić utknięte joby

```sql
UPDATE translation_jobs 
SET status = 'failed', 
    error_message = 'Stuck in processing - cleaned up',
    updated_at = NOW()
WHERE status = 'processing' 
  AND updated_at < NOW() - INTERVAL '1 hour';
```

## Pliki do zmiany
1. `supabase/functions/background-translate/index.ts` — timeout handling, Norwegian, delays
2. `supabase/functions/scheduled-translate-sync/index.ts` — sequential processing, dedup
3. `supabase/functions/translate-content/index.ts` — Norwegian w LANGUAGE_NAMES
4. Nowa migracja SQL — cleanup stuck jobs

