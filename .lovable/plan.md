

## WOW podgląd testymoniali + system komentarzy z gwiazdkami

### Cel
1. Podgląd testymonialu ma być wizualnie atrakcyjny i przykuwający uwagę (efekt "wow")
2. Admin może włączyć komentowanie per testymonial — użytkownicy oceniają gwiazdkami (1-5) i piszą opinię
3. Komentarze wyświetlane z imieniem, nazwiskiem i avatarem

### Zmiany

**1. Migracja bazy — tabela `testimonial_comments` + kolumna `allow_comments`**
```sql
ALTER TABLE public.healthy_knowledge 
  ADD COLUMN allow_comments boolean DEFAULT false;

CREATE TABLE public.testimonial_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id uuid REFERENCES healthy_knowledge(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(knowledge_id, user_id) -- jeden komentarz per user per testymonial
);

ALTER TABLE testimonial_comments ENABLE ROW LEVEL SECURITY;
-- Wszyscy zalogowani mogą czytać
CREATE POLICY "Anyone can read comments" ON testimonial_comments FOR SELECT TO authenticated USING (true);
-- User może dodać/edytować swój komentarz
CREATE POLICY "Users can insert own" ON testimonial_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own" ON testimonial_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
-- Admin może usuwać
CREATE POLICY "Admin can delete" ON testimonial_comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

**2. Typy — `src/types/healthyKnowledge.ts`**
- Dodać `allow_comments: boolean` do interfejsu `HealthyKnowledge`
- Dodać interfejs `TestimonialComment` (id, knowledge_id, user_id, rating, comment, created_at, profiles?: {first_name, last_name, avatar_url})

**3. Admin — `HealthyKnowledgeManagement.tsx`**
- Przy kategorii "Testymoniale": dodać Switch "Zezwól na komentarze i oceny"

**4. Podgląd WOW — `src/pages/HealthyKnowledge.tsx`**
Kompletna przebudowa dialogu testymoniali:

- **Fullscreen-like overlay** z ciemnym tłem i delikatnym gradient glow
- **Duża karuzela** z płynnym przejściem, strzałkami po bokach, wskaźnikiem kropek na dole
- **Sekcja tekstowa** pod karuzelą: tytuł z golden accent, opis z ładną typografią
- **Średnia ocena** wyświetlana jako złote gwiazdki z liczbą opinii
- **Sekcja komentarzy**: lista istniejących opinii (avatar + imię + gwiazdki + tekst + data) + formularz dodania własnej (gwiazdki do kliknięcia + textarea)
- Animacje: fade-in, scale-in przy otwarciu

Układ podglądu:
```text
┌─────────────────────────────────┐
│  [X]                            │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    CAROUSEL (duży)        │  │
│  │    ← zdjęcie →            │  │
│  │                           │  │
│  └───────────────────────────┘  │
│  ●●○●● (dots)    1/6           │
│                                 │
│  ★★★★☆  4.2 (12 opinii)       │
│                                 │
│  Tytuł testymonialu             │
│  Opis treści...                 │
│                                 │
│  ─── Opinie ───                 │
│  [avatar] Jan K. ★★★★★         │
│  "Świetne efekty po 3 mies..." │
│                                 │
│  [avatar] Anna M. ★★★★☆       │
│  "Polecam każdemu..."           │
│                                 │
│  ─── Dodaj swoją opinię ───    │
│  ★★★★★ (klikalne)              │
│  [textarea]                     │
│  [Wyślij opinię]                │
└─────────────────────────────────┘
```

### Szczegóły techniczne

Komentarze fetch z JOIN na profiles:
```tsx
const { data } = await supabase
  .from('testimonial_comments')
  .select('*, profiles:user_id(first_name, last_name, avatar_url)')
  .eq('knowledge_id', materialId)
  .order('created_at', { ascending: false });
```

Złote gwiazdki (klikalne przy dodawaniu):
```tsx
{[1,2,3,4,5].map(star => (
  <Star key={star} 
    className={cn("w-5 h-5 cursor-pointer transition-colors", 
      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted")}
    onClick={() => setRating(star)} />
))}
```

Zmiana dotyczy 3 plików + 1 migracja SQL.

