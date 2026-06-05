## 1. Omega/Medical search widget — tylko na Pulpicie głównym
**File:** `src/components/MedicalChatWidget.tsx`
- Zmień `if (location.pathname === '/omega-base') return null;` → `if (location.pathname !== '/dashboard') return null;`

## 2. Centrum Aktualności – lista (`src/pages/NewsHubPage.tsx`)
- Header: skróć link powrotu na mobile (ikona + krótki tekst), „Zarządzaj" jako ikona‑only do `sm`.
- Pasek filtrów: search `w-full`, pod nim `grid grid-cols-2 gap-2` z Selectami (Sortuj, Kategoria), Typ pełna szerokość; selecty `w-full min-w-0`.
- `<section>` z postami: zmień `pb-16` → `pb-28 md:pb-16` (żeby dolny pasek nawigacji mobilnej nie zakrywał ostatnich kart).
- `NewsHubArchive` w sidebarze: `order-last lg:order-none`, na mobile w pełnej szerokości pod listą.

## 3. Pojedynczy artykuł (`src/pages/NewsHubPostPage.tsx` + `src/components/news-hub/PostContent.tsx`)
**NewsHubPostPage.tsx:**
- Sticky header: skrócony tekst back‑link na mobile, przyciski „Edytuj" i „Zarządzaj" jako ikona‑only do `sm` (`<span className="hidden sm:inline">…</span>`), `gap-1.5`.
- `<main>`: `px-4 py-6 md:py-8`, `pb-28 md:pb-12`.

**PostContent.tsx:**
- Tytuł: `text-2xl sm:text-3xl md:text-4xl break-words`.
- Cover: gdy brak `cover.height` w `style_overrides` → `max-h-[55vh] md:max-h-none` na wrapperze i `aspect-[16/10] md:aspect-auto`.
- Opis: `text-base sm:text-lg`.
- Meta chips: `whitespace-normal` na dacie.

## 4. Komentarze – odpowiedzi (wątki) + reakcje 👍/👎
Każdy komentarz może mieć odpowiedzi (na takich samych zasadach: moderacja słów zakazanych, edycja 1 min, polityka widoczności pending) oraz reakcje kciuk w górę / w dół.

### 4a. Migracja SQL
- `news_hub_comments`: dodać kolumnę `parent_id uuid NULL REFERENCES public.news_hub_comments(id) ON DELETE CASCADE` + index `(post_id, parent_id, created_at)`. Limit zagnieżdżenia: trigger wymuszający, że `parent_id` musi wskazywać komentarz, którego `parent_id IS NULL` (jednopoziomowe wątki — odpowiedzi nie mogą mieć dalszych odpowiedzi; klasyczny model „comment → replies").
- Nowa tabela `public.news_hub_comment_reactions`:
  ```
  id uuid PK default gen_random_uuid()
  comment_id uuid NOT NULL REFERENCES news_hub_comments(id) ON DELETE CASCADE
  user_id uuid NOT NULL
  value smallint NOT NULL CHECK (value IN (-1, 1))
  created_at timestamptz NOT NULL default now()
  UNIQUE (comment_id, user_id)
  ```
- GRANTs: `SELECT, INSERT, UPDATE, DELETE` dla `authenticated`; `ALL` dla `service_role`.
- RLS:
  - SELECT: każdy zalogowany może czytać reakcje do komentarzy, do których ma dostęp (proste: `TO authenticated USING (true)`).
  - INSERT/UPDATE/DELETE: tylko własne (`user_id = auth.uid()`); moderator może DELETE dowolne.
- Realtime: dołącz tabelę do `supabase_realtime`.
- Trigger walidujący (przy INSERT odpowiedzi): odpalić istniejący `scan_comment_profanity` na `content` odpowiedzi tak samo jak dla komentarzy głównych → ustawia `is_pending_review`. Reużyć istniejący trigger; działa już na całej tabeli więc OK.

### 4b. Frontend – hook `src/hooks/useNewsHubComments.ts`
- W `Comment` typie dodać: `parent_id: string | null`, `reactions: { up: number; down: number; mine: -1 | 0 | 1 }`.
- Fetch: jednym zapytaniem pobrać wszystkie komentarze posta (z `parent_id`), w pamięci zbudować mapę `repliesByParent`.
- Realtime: nasłuchiwać też tabeli reakcji (`postgres_changes` na `news_hub_comment_reactions` filtr po liście comment_id w cache) → odświeżać liczniki.
- `addComment(content, parentId?: string | null)` – przekazuje `parent_id`. Odpowiedzi też podlegają polityce 1 min edycji i regule pending.
- `react(commentId, value: 1 | -1)`: upsert do `news_hub_comment_reactions`; jeśli `mine === value` → DELETE (toggle).

### 4c. UI – `src/components/news-hub/CommentsSection.tsx`
- Każdy komentarz: dodać pasek akcji pod treścią z dwoma przyciskami (ikony `ThumbsUp`, `ThumbsDown` z lucide), licznikami i przyciskiem „Odpowiedz".
- Po kliknięciu „Odpowiedz": otwiera mały inline editor pod komentarzem (`Textarea` + przycisk Wyślij/Anuluj), submit wywołuje `addComment(text, comment.id)`.
- Renderowanie odpowiedzi: lista `replies[comment.id]` wcięta (`ml-8 border-l border-border pl-4 mt-2`).
- W odpowiedziach **brak** kolejnego przycisku „Odpowiedz" (jednopoziomowe wątki).
- Reakcje i edycja działają identycznie dla odpowiedzi (1 min okno edycji, badge „Oczekuje na zatwierdzenie" widoczny tylko dla admina/moderatora — autor nie widzi swojej odpowiedzi do moderacji, toast informuje).
- Reakcje wyłączone (disabled) dla komentarzy `is_pending_review` i `is_hidden`.

### 4d. Panel admina `NewsHubCommentsModerationPanel.tsx`
- W liście pending wyświetlać też kontekst: jeśli `parent_id IS NOT NULL` → pokaż „Odpowiedź na: <skrócona treść rodzica>" + link do posta.
- Reakcje nie wymagają moderacji.

## Pliki edytowane
- `src/components/MedicalChatWidget.tsx`
- `src/pages/NewsHubPage.tsx`
- `src/pages/NewsHubPostPage.tsx`
- `src/components/news-hub/PostContent.tsx`
- `src/hooks/useNewsHubComments.ts`
- `src/components/news-hub/CommentsSection.tsx`
- `src/components/admin/news-hub/NewsHubCommentsModerationPanel.tsx`
- nowa migracja Supabase (parent_id + tabela reakcji + RLS + GRANTs)
