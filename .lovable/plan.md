

# Diagnoza: Brakujący moduł TECHNICZNE w panelu admina

## Problem
Jarosław Wiglusz ma przypisany moduł TECHNICZNE w bazie danych (`training_assignments`), ale nie widzi go w zakładce "Postępy użytkowników" w CMS admina.

## Przyczyna
Tabela `training_assignments` zawiera **1244 rekordów**. Zapytanie Supabase w `fetchUserProgress` (linia 863) pobiera je **bez paginacji**:

```typescript
const { data: assignments } = await supabase
  .from('training_assignments')
  .select(`user_id, module_id, ...`)
  // ← BRAK .range() lub paginacji
```

**Supabase domyślnie zwraca maksymalnie 1000 wierszy.** Pozostałe 244 rekordy (w tym TECHNICZNE dla Jarosława) są po cichu obcinane.

Co ciekawe, pobieranie `training_progress` (linia 891) **już ma paginację** — ktoś naprawił ten problem wcześniej, ale zapomniał o `training_assignments`.

## Rozwiązanie
Dodać paginację do zapytania `training_assignments` w `fetchUserProgress` — identyczny wzorzec jak istniejąca paginacja `training_progress` (linie 887-903):

```typescript
let allAssignments: any[] = [];
let from = 0;
const batchSize = 1000;

while (true) {
  const { data, error } = await supabase
    .from('training_assignments')
    .select(`...`)
    .range(from, from + batchSize - 1);
  
  if (error) throw error;
  if (!data || data.length === 0) break;
  allAssignments = [...allAssignments, ...data];
  if (data.length < batchSize) break;
  from += batchSize;
}
```

## Plik do zmiany
- `src/components/admin/TrainingManagement.tsx` — paginacja w `fetchUserProgress` dla `training_assignments` (linie 863-882)

