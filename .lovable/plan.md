

## Pełna moderacja opinii — edycja, zawieszenie, usunięcie

### Co się zmieni

Sekcja „Moderacja opinii" w zakładce Testymoniale będzie wyświetlać **wszystkie opinie** (nie tylko oczekujące) z pełnym zestawem akcji dla admina:

1. **Edycja** — dialog z polami: treść opinii, ocena (gwiazdki). Admin może poprawić tekst.
2. **Zawieszenie** — nowy status `suspended` (opinia ukryta publicznie, ale nie usunięta). Zawieszoną opinię można przywrócić.
3. **Usunięcie** — trwałe usunięcie opinii z bazy danych.

### Zmiany techniczne

#### 1. Nowa RPC lub zmiana istniejącej (`get_pending_testimonial_comments`)
- Zmienić RPC `get_pending_testimonial_comments` tak, by zwracała **wszystkie** opinie (nie tylko `pending`), albo stworzyć nową RPC `get_all_testimonial_comments`.
- SQL migration: dodać wartość `suspended` do dozwolonych statusów w kolumnie `status` tabeli `testimonial_comments` (CHECK constraint lub enum).

#### 2. `src/components/admin/HealthyKnowledgeManagement.tsx`
- Zmienić `fetchPendingComments` na pobieranie wszystkich opinii.
- Dodać stan i dialog do edycji opinii (treść + ocena).
- Dodać przyciski akcji dla **każdej** opinii (nie tylko pending):
  - ✏️ **Edytuj** — otwiera dialog edycji
  - ⏸️ **Zawieś / Przywróć** — toggle `suspended` ↔ `approved`
  - 🗑️ **Usuń** — z potwierdzeniem, DELETE z bazy
- Nowe handlery: `handleEditComment`, `handleSuspendComment`, `handleDeleteComment`.

#### 3. `src/types/healthyKnowledge.ts`
- Rozszerzyć typ `TestimonialComment.status` o `'suspended'`.

#### 4. Widoczność publiczna
- Upewnić się, że RPC `get_testimonial_comments` (publiczna) filtruje `status = 'approved'` — opinie `suspended` i `rejected` pozostają ukryte.

#### 5. SQL migration
```sql
-- Dodanie statusu 'suspended' do testimonial_comments
ALTER TABLE testimonial_comments 
  DROP CONSTRAINT IF EXISTS testimonial_comments_status_check;
ALTER TABLE testimonial_comments 
  ADD CONSTRAINT testimonial_comments_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Nowa/zmieniona RPC zwracająca wszystkie opinie dla admina
CREATE OR REPLACE FUNCTION get_all_testimonial_comments()
RETURNS TABLE(...) AS $$ ... WHERE 1=1 ORDER BY created_at DESC $$ ;
```

### Pliki do modyfikacji
1. **SQL migration** — nowy status `suspended`, nowa RPC
2. **`src/types/healthyKnowledge.ts`** — dodać `'suspended'` do typu
3. **`src/components/admin/HealthyKnowledgeManagement.tsx`** — przebudowa sekcji moderacji z pełnymi akcjami i dialogiem edycji

