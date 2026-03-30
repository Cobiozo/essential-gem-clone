

## Naprawa dodawania opinii + zatwierdzanie przez admina

### Problem 1: Błąd PostgREST join
Zapytanie `select('*, profiles:user_id(...)')` nie działa, bo PostgREST nie potrafi rozwiązać relacji między `testimonial_comments.user_id` → `auth.users` ← `profiles.user_id` (obie tabele wskazują na `auth.users`, brak bezpośredniego FK między nimi).

### Problem 2: Brak moderacji opinii
Opinie powinny wymagać zatwierdzenia przez admina przed wyświetleniem.

### Rozwiązanie

**1. Migracja bazy danych**
- Dodać kolumnę `status text DEFAULT 'pending'` do `testimonial_comments` (wartości: `pending`, `approved`, `rejected`)
- Zaktualizować politykę SELECT: zwykli użytkownicy widzą tylko `approved`, admin widzi wszystkie
- Dodać politykę UPDATE dla admina (zmiana statusu)

```sql
ALTER TABLE testimonial_comments ADD COLUMN status text DEFAULT 'pending';

-- Update SELECT: users see approved + own pending; admins see all
DROP POLICY "Anyone can read comments" ON testimonial_comments;
CREATE POLICY "Read approved or own" ON testimonial_comments
  FOR SELECT TO authenticated
  USING (status = 'approved' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
```

**2. Funkcja SQL do pobierania komentarzy z profilami**
Zamiast niezdanego joina PostgREST, stworzyć funkcję `SECURITY DEFINER`:

```sql
CREATE FUNCTION get_testimonial_comments(p_knowledge_id uuid)
RETURNS TABLE(...) AS $$
  SELECT tc.*, p.first_name, p.last_name, p.avatar_url
  FROM testimonial_comments tc
  LEFT JOIN profiles p ON p.user_id = tc.user_id
  WHERE tc.knowledge_id = p_knowledge_id
  AND (tc.status = 'approved' OR tc.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ORDER BY tc.created_at DESC
$$;
```

**3. Frontend — `TestimonialPreviewDialog.tsx`**
- Zamienić `supabase.from('testimonial_comments').select(...)` na `supabase.rpc('get_testimonial_comments', { p_knowledge_id: ... })`
- Wyświetlać badge "Oczekuje" przy własnej niezatwierdzonej opinii

**4. Admin — panel zatwierdzania opinii**
- W `HealthyKnowledgeManagement.tsx` dodać sekcję/zakładkę "Opinie do zatwierdzenia"
- Lista pending opinii z przyciskami Zatwierdź / Odrzuć
- Wywołanie `supabase.from('testimonial_comments').update({ status: 'approved' })`

### Pliki do modyfikacji
- 1 migracja SQL (kolumna `status`, RLS, funkcja RPC)
- `src/components/testimonials/TestimonialPreviewDialog.tsx` — zmiana fetch na RPC
- `src/components/admin/HealthyKnowledgeManagement.tsx` — panel moderacji opinii
- `src/types/healthyKnowledge.ts` — dodanie `status` do interfejsu

