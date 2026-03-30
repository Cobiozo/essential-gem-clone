

## Dwie zmiany

### 1. Autor widzi swoją pending opinię w podglądzie publicznym

**Problem**: Obecnie RPC `get_testimonial_comments` zwraca TYLKO approved. Autor nie widzi swojej oczekującej opinii.

**Rozwiązanie**: Zmienić RPC `get_testimonial_comments` — dodać warunek `OR tc.user_id = auth.uid()` tak by autor widział swoją opinię (niezależnie od statusu), a reszta użytkowników widzi tylko approved.

**SQL migration**:
```sql
CREATE OR REPLACE FUNCTION public.get_testimonial_comments(p_knowledge_id uuid)
...
WHERE tc.knowledge_id = p_knowledge_id
  AND (tc.status = 'approved' OR tc.user_id = auth.uid())
ORDER BY tc.created_at DESC;
```

**Frontend (`TestimonialPreviewDialog.tsx`)**:
- Dodać badge "Oczekuje na zatwierdzenie" przy własnym pending komentarzu autora
- Usunąć dodatkowe zapytanie `supabase.from('testimonial_comments').select(count)` — teraz RPC zwraca pending komentarz autora, więc `hasAnyComment` można ustawić na podstawie danych z RPC
- Średnia ocen i licznik opinii liczone tylko z approved (filtr `c.status === 'approved'`)

### 2. Tabela testymoniali w panelu admina — pełny format jak "Materiały"

**Problem**: Zakładka "Testymoniale" pokazuje uproszczoną tabelę (brak kolumn Kategoria, Widoczność, ikon akcji).

**Rozwiązanie** (`HealthyKnowledgeManagement.tsx`): Zamienić uproszczoną tabelę testymoniali (linie ~763-830) na pełną tabelę identyczną z zakładką "Materiały" — z kolumnami: Materiał (thumbnail + opis), Typ + język, Kategoria, Widoczność (badge'e ról), Status (aktywny/ukryty + featured + share), Akcje (przyciski: featured, hide/show, edit, delete).

### Pliki do modyfikacji
- **SQL migration** — update `get_testimonial_comments` RPC
- `src/components/testimonials/TestimonialPreviewDialog.tsx` — pending badge + cleanup
- `src/components/admin/HealthyKnowledgeManagement.tsx` — pełna tabela testymoniali

