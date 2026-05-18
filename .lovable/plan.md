
# News Hub — centrum ogłoszeń Pure Life

Nowy, dedykowany moduł zastępujący prymitywną stronę CMS „Aktualności". Pozwala adminom publikować ogłoszenia, artykuły, wideo, galerie, pliki i linki/embedy w atrakcyjnym layoucie Bento Grid.

## Co użytkownik zobaczy

**Strona `/aktualnosci`** (dla zalogowanych użytkowników):
- Hero z tytułem i krótkim opisem (edytowalne w ustawieniach modułu)
- Pasek filtrów: Wszystko / Ogłoszenia / Artykuły / Wideo / Galerie / Pliki / Linki + wyszukiwarka
- **Bento Grid** — mieszane rozmiary kart (1x1, 2x1, 2x2). Featured posty zajmują większe pola, zwykłe mniejsze. Karty pokazują miniaturę/ikonę typu, kategorię, tytuł, datę, autora.
- Klik w kartę → modal/strona szczegółów (zależnie od typu):
  - Ogłoszenie/Artykuł: pełna treść Markdown, okładka, galeria
  - Wideo: odtwarzacz (YouTube/Vimeo/MP4)
  - Galeria: lightbox
  - Plik: przycisk pobierz
  - Link/Embed: przekierowanie / osadzony iframe
- Paginacja / „załaduj więcej"
- Sekcja „Przypięte" na górze dla najważniejszych ogłoszeń

**Panel admina `/admin/news-hub`** (nowa zakładka w admin sidebarze):
- Tabela wszystkich postów z filtrami (typ, status, kategoria, data)
- Akcje: Edytuj, Przypnij/Odepnij, Aktywuj/Dezaktywuj, Duplikuj, Usuń
- Formularz nowego posta z dynamicznymi polami zależnymi od typu:
  - Wybór typu (radio: Ogłoszenie / Artykuł / Wideo / Galeria / Plik / Link / Embed)
  - Wspólne: tytuł, slug (auto), kategoria, tagi, okładka, krótki opis, data publikacji, autor, status (szkic/opublikowany), przypięty, rozmiar w bento (S/M/L)
  - Typ-specyficzne pola: treść Markdown, URL wideo, upload pliku/galerii, URL linku + opis CTA, HTML embed
- Zarządzanie kategoriami (CRUD)
- Statystyki: liczba wyświetleń per post

## Sekcja techniczna

**Baza danych** (migracja):
- `news_hub_posts` — id, type (enum: announcement/article/video/gallery/file/link/embed), title, slug, category_id, tags[], cover_url, short_description, content (markdown), media_url, media_metadata (jsonb: dla galerii/wideo/embed), file_url, file_name, file_size, link_url, link_cta, embed_html, author_id, is_pinned, is_published, bento_size (s/m/l), published_at, view_count, timestamps
- `news_hub_categories` — id, name, slug, color, icon, sort_order
- `news_hub_views` — id, post_id, user_id, viewed_at (do statystyk)
- RLS: SELECT dla wszystkich zalogowanych (is_published=true); INSERT/UPDATE/DELETE tylko admin via `has_role(auth.uid(),'admin')`
- Storage bucket `news-hub-media` (public) dla okładek/galerii/plików

**Routing**:
- `/aktualnosci` — publiczna strona modułu (zalogowani)
- `/admin/news-hub` — panel administracyjny
- Dodać do `KNOWN_APP_ROUTES`
- Stara strona CMS `/page/aktualnosci` — przekierowanie 301 → `/aktualnosci` (lub usunięcie wpisu CMS po migracji)

**Komponenty** (`src/components/news-hub/`):
- `NewsHubPage.tsx` — kontener, filtry, paginacja
- `BentoGrid.tsx` — responsywny grid z mieszanymi rozmiarami (CSS grid `grid-auto-flow: dense`)
- `PostCard.tsx` — uniwersalna karta z wariantem per typ
- `PostDetailModal.tsx` — szczegóły z odpowiednim viewerem
- `MediaViewer.tsx`, `Lightbox.tsx`, `EmbedRenderer.tsx`
- Admin: `NewsHubAdminPage.tsx`, `PostFormDialog.tsx`, `CategoryManager.tsx`

**Hooks**:
- `useNewsHubPosts(filters)` — fetch z paginacją + realtime subskrypcja
- `useNewsHubCategories()`
- `useNewsHubAdmin()` — CRUD dla admina

**Stylistyka**: semantic tokens z `index.css`; karty z `bg-card`, `border-border`, hover lift z `shadow-elegant`; featured z gradientem `--gradient-primary`. Animacje wejścia (framer-motion stagger).

**Integracje opcjonalne** (do rozważenia w v2, nie w tym kroku):
- Link z News Tickera → post w News Hub
- RSS feed
- Komentarze / reakcje

## Zakres tej iteracji

1. Migracja DB (tabele + RLS + storage bucket)
2. Hooks + typy TS
3. Strona `/aktualnosci` z Bento Grid + filtrami + modalem szczegółów
4. Panel admina `/admin/news-hub` z formularzem dla wszystkich 7 typów
5. Dodanie linku do admin sidebar
6. Zaktualizowanie routingu (KNOWN_APP_ROUTES + przekierowanie ze starej strony)
7. Seed kilku przykładowych kategorii (Ogłoszenia, Wydarzenia, Edukacja, Promocje)

Bez zmian w istniejącym News Tickerze ani innych modułach.
