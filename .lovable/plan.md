
# Plan: Naprawa dodawania okładek w Zdrowa Wiedza

## Zdiagnozowana przyczyna błędu

Błąd **"new row violates row-level security policy"** jest spowodowany brakiem polityki RLS `UPDATE` dla bucketu `healthy-knowledge` w Supabase Storage.

### Aktualne polityki dla `healthy-knowledge`:
| Operacja | Polityka | Status |
|----------|----------|--------|
| SELECT | ✅ "Public read access for healthy-knowledge" | Istnieje |
| INSERT | ✅ "Admins can upload to healthy-knowledge" | Istnieje |
| DELETE | ✅ "Admins can delete from healthy-knowledge" | Istnieje |
| UPDATE | ❌ **BRAK POLITYKI** | Brak |

### Dlaczego to powoduje błąd:
Kod w `HealthyKnowledgeManagement.tsx` (linia 777) używa:
```typescript
.upload(fileName, file, { upsert: true });
```

Opcja `upsert: true` wymaga zarówno uprawnień `INSERT` jak i `UPDATE`, ponieważ może nadpisać istniejący plik.

---

## Rozwiązanie

### Zmiana 1: Migracja SQL - dodanie polityki UPDATE

Utworzyć nową migrację dodającą brakującą politykę:

```sql
-- Add missing UPDATE policy for healthy-knowledge bucket
CREATE POLICY "Admins can update healthy-knowledge files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
)
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
);
```

### Zmiana 2 (opcjonalna): Alternatywa - unikanie upsert

Jeśli chcemy uniknąć modyfikacji RLS, można zmienić kod tak, aby nie używał `upsert`:
1. Sprawdzić czy plik istnieje
2. Jeśli tak - usunąć go
3. Wgrać nowy plik

Jednak **preferowane jest rozwiązanie 1** (dodanie polityki UPDATE), ponieważ:
- Jest bardziej eleganckie
- Nie wymaga dodatkowych zapytań
- Jest spójne z pozostałymi bucketami (np. `training-media` ma politykę UPDATE)

---

## Szczegóły implementacji

### Nowy plik migracji
**Ścieżka**: `supabase/migrations/[timestamp]_add_healthy_knowledge_update_policy.sql`

```sql
-- Add missing UPDATE policy for healthy-knowledge storage bucket
-- This is required because the thumbnail upload uses upsert: true option

CREATE POLICY "Admins can update healthy-knowledge files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
)
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin())
);
```

---

## Oczekiwany rezultat

Po wdrożeniu:
1. Administratorzy będą mogli dodawać okładki do istniejących materiałów bez błędów
2. Opcja `upsert: true` będzie działać poprawnie
3. Bezpieczeństwo pozostanie zachowane - tylko administratorzy mogą modyfikować pliki

---

## Weryfikacja po wdrożeniu

1. Zalogować się jako administrator
2. Przejść do Zdrowa Wiedza → edycja istniejącego materiału wideo
3. Wybrać plik okładki (dowolny obraz JPG/PNG)
4. Sprawdzić czy okładka została przesłana bez błędu RLS
