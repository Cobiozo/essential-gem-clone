# Komentarze w artykułach Centrum Aktualności

## Cel
Dodać sekcję komentarzy na stronie pojedynczego artykułu (`/aktualnosci/:slug`), z możliwością włączenia/wyłączenia przez admina — globalnie dla modułu oraz per-post. Komentarze mogą pojawić się:
1. Automatycznie na samym dole artykułu (pod treścią), jeśli włączone.
2. Jako blok `comments` wstawiany w dowolnym miejscu treści przez edytor blokowy.

Tylko zalogowani użytkownicy mogą dodawać i widzieć komentarze. Admin/moderator z dostępem do News Hub może moderować (ukryć/usunąć dowolny komentarz, przypiąć).

## Zakres funkcjonalny

### Ustawienia (admin)
- W `useNewsHubSettings` dodać dwa nowe flagi globalne:
  - `comments_enabled` (bool, domyślnie `false`) — master switch dla modułu.
  - `comments_require_login` (bool, domyślnie `true`) — zostaje `true` zgodnie z wymaganiem.
- W panelu `/admin/news-hub` (zakładka "Ustawienia") nowa sekcja "Komentarze" z togglem włącz/wyłącz.
- W edytorze pojedynczego posta (`PostInlineEditor`) dodać przełącznik `comments_enabled` per-post (override). Wartości: `inherit` / `on` / `off`. Domyślnie `inherit`.

### Strona artykułu (`NewsHubPostPage` + `PostContent`)
- Jeśli `effectiveCommentsEnabled(post, settings) === true`:
  - Wyrenderuj `<CommentsSection postId={post.id} />` na końcu `<article>` (po tagach), o ile w treści nie ma już bloku `comments` (żeby nie dublować).
- Blok `comments` w edytorze blokowym — nowy typ w `newsHubBlocks.ts`:
  - `BLOCK_LABELS.comments = 'Komentarze'`
  - `createBlock('comments')` → `{ data: { title?: 'Komentarze', limit?: number } }`
  - `BlockRenderer` renderuje `<CommentsSection postId={post.id} inline title={...} />`
  - Edytor bloków: prosty inspector (tytuł, opcjonalny limit wyświetlanych).

### Komponent `CommentsSection`
- Lista komentarzy (płaska, sortowanie od najnowszych; przypięte na górze).
- Pole "Dodaj komentarz" (Textarea + przycisk) — tylko dla zalogowanych. Dla niezalogowanych: krótki komunikat "Zaloguj się, aby dodać komentarz" z linkiem do `/auth`.
- Każdy komentarz: avatar + imię/nazwisko z `profiles`, data, treść (sanityzowana, plain text + linki autodetect), akcje:
  - Autor komentarza: Edytuj / Usuń (soft).
  - Admin / moderator z dostępem do news-hub: Ukryj / Usuń / Przypnij.
- Realtime: subskrypcja `postgres_changes` na `news_hub_comments` filtrowana po `post_id`.
- Walidacja: trim, min 2 / max 2000 znaków (zod).
- Bezpieczeństwo: brak `dangerouslySetInnerHTML`; treść wyświetlana jako tekst z `whitespace-pre-wrap`.

### Liczniki
- Na karcie posta (`PostCard`/`BentoCard`) — bez zmian wizualnych w tym kroku (opcjonalnie później), żeby nie rozszerzać zakresu.

## Zakres techniczny

### Baza danych (migration)
```sql
create table public.news_hub_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.news_hub_posts(id) on delete cascade,
  user_id uuid not null,
  content text not null check (char_length(content) between 2 and 2000),
  is_hidden boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.news_hub_comments (post_id, created_at desc);

grant select, insert, update, delete on public.news_hub_comments to authenticated;
grant all on public.news_hub_comments to service_role;

alter table public.news_hub_comments enable row level security;

-- SELECT: zalogowani widzą nieukryte; autor widzi swoje; admin/moderator z dostępem do news-hub widzi wszystko
create policy "read visible comments" on public.news_hub_comments
  for select to authenticated
  using (
    is_hidden = false
    or user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
    or public.has_moderator_module(auth.uid(), 'news-hub')  -- fallback do has_role jeśli funkcja nie istnieje
  );

-- INSERT: tylko swoje, tylko gdy moduł komentarzy włączony globalnie
create policy "insert own comment" on public.news_hub_comments
  for insert to authenticated
  with check (user_id = auth.uid());

-- UPDATE: autor (edycja treści w ciągu np. zawsze) lub admin/mod (moderacja flag)
create policy "update own or moderate" on public.news_hub_comments
  for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- DELETE: autor lub admin
create policy "delete own or admin" on public.news_hub_comments
  for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- updated_at trigger (reużywając istniejącej funkcji)
create trigger trg_news_hub_comments_updated_at
before update on public.news_hub_comments
for each row execute function public.update_updated_at_column();
```

Dodatkowo: kolumna na poście:
```sql
alter table public.news_hub_posts
  add column if not exists comments_mode text not null default 'inherit'
    check (comments_mode in ('inherit','on','off'));
```

Ustawienia globalne (jeśli `news_hub_settings` to tabela JSON/kv) — dopisać klucz `comments_enabled` (`true`/`false`) bez migracji schematu (insert/update przez UI).

### Frontend — nowe / edytowane pliki
- **Nowe:**
  - `src/components/news-hub/CommentsSection.tsx` — lista + formularz + realtime.
  - `src/components/news-hub/CommentItem.tsx` — pojedynczy komentarz + akcje.
  - `src/hooks/useNewsHubComments.ts` — fetch, insert, update, delete, realtime, join z `profiles`.
- **Edytowane:**
  - `src/types/newsHubBlocks.ts` — dodać typ `comments`, label, factory.
  - `src/components/news-hub/BlockRenderer.tsx` — render bloku `comments`.
  - `src/components/news-hub/blocks/BlockInspector.tsx` (lub odpowiednik) — inspector dla `comments`.
  - `src/components/news-hub/PostContent.tsx` — render `<CommentsSection>` na dole, jeśli włączone i brak bloku `comments` w treści.
  - `src/pages/NewsHubPostPage.tsx` — przekazać `settings` / wyliczyć `commentsEnabled`.
  - `src/hooks/useNewsHubSettings.ts` — dodać `comments_enabled` (+ helper `isCommentsEnabledForPost(post, settings)`).
  - `src/pages/NewsHubAdminPage.tsx` (zakładka Ustawienia) — toggle "Włącz komentarze".
  - `src/components/news-hub/PostInlineEditor.tsx` — select `comments_mode` (Dziedzicz / Włącz / Wyłącz).
  - `src/types/newsHub.ts` — `comments_mode?: 'inherit' | 'on' | 'off'`.

### Logika `effectiveCommentsEnabled`
```ts
function isOn(post, settings) {
  if (post.comments_mode === 'on') return true;
  if (post.comments_mode === 'off') return false;
  return !!settings.comments_enabled; // inherit
}
```

### Wpływ na inne obszary
- `PostContent` używane także w podglądzie (`NewsHubPostPage` edit mode) — w trybie edycji renderujemy sekcję jako podgląd (read-only), bez subskrypcji realtime, aby nie generować ruchu.
- Brak zmian RLS innych tabel, brak zmian innych ustawień.

## Co NIE wchodzi w zakres
- Komentarze gości (niezalogowanych) — wymóg loginu zgodnie z prośbą.
- Zagnieżdżone odpowiedzi (threading) — wersja płaska na start; można dodać `parent_id` później.
- Reakcje (lajki) — pomijamy.
- Powiadomienia push/e-mail o nowych komentarzach — pomijamy.
- Licznik komentarzy na kartach Bento — pomijamy w tej iteracji.
