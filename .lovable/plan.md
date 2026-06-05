## Komentarze – moderacja, okno 5 minut i filtr wulgaryzmów

### 1. Natychmiastowe usuwanie (realtime)
- `CommentsSection.tsx`: po kliknięciu **Usuń** od razu usuwamy komentarz z lokalnego stanu (optymistyczna aktualizacja), a dopiero potem wysyłamy `DELETE` do bazy. W razie błędu przywracamy wpis i pokazujemy toast.
- `useNewsHubComments.ts`: dodajemy `removeLocal(id)` / `upsertLocal(c)` aby UI nie czekał na realtime.
- Subskrypcja realtime nadal działa – usunięcie u jednego użytkownika znika u pozostałych w czasie rzeczywistym (już skonfigurowane).

### 2. Okno 5 minut dla autora
- Autor może **edytować i usuwać własny komentarz tylko przez 5 minut** od `created_at`.
- Po upływie 5 minut: przyciski „Edytuj" i „Usuń" znikają dla autora.
- **Admin** (oraz moderator z modułem `news_hub`) zawsze może edytować, ukrywać, przypinać i usuwać dowolny komentarz – bez limitu czasu.
- Wymusimy to także na poziomie bazy (RLS), aby nie dało się obejść z frontu:
  - `UPDATE`/`DELETE` dla zwykłego użytkownika: `user_id = auth.uid() AND created_at > now() - interval '5 minutes' AND is_pending_review = false`.
  - Dla admina/moderatora: bez ograniczeń (przez `has_role` / `has_moderator_module`).

### 3. Filtr wulgaryzmów + kolejka do zatwierdzenia
- Nowa tabela słów: `news_hub_comment_banned_words` (lista słów/fraz, edytowalna przez admina).
  - Pola: `word` (text, lowercase), `created_by`, `created_at`. Indeks unikalny na `lower(word)`.
- Nowe kolumny w `news_hub_comments`:
  - `is_pending_review boolean default false` – komentarz oczekuje na decyzję admina.
  - `flagged_words text[]` – wykryte słowa (do podglądu admina).
  - `reviewed_by uuid`, `reviewed_at timestamptz`, `review_decision text` (`approved` | `rejected`).
- Funkcja `public.scan_comment_profanity(text) returns text[]` – zwraca trafione słowa (case-insensitive, granice słów).
- Trigger `BEFORE INSERT/UPDATE OF content`:
  - Jeśli znajdzie wulgaryzmy → ustawia `is_hidden = true`, `is_pending_review = true`, `flagged_words = <lista>`.
  - Powiadamia admina: wpis do istniejącego systemu powiadomień / logu (do potwierdzenia – patrz pytanie 1).
- RLS:
  - Komentarz `is_pending_review = true` jest **widoczny tylko** dla autora (z banerem „Oczekuje na moderację") i moderatorów; niewidoczny dla innych.
  - Autor **nie może edytować** komentarza w stanie `is_pending_review`.
  - Tylko admin/moderator może go zatwierdzić (`approve` → `is_hidden=false, is_pending_review=false`) lub odrzucić (`reject` → usunięcie lub trwałe ukrycie).

### 4. Panel moderacji w `/admin/news-hub`
- Nowa zakładka „Komentarze do zatwierdzenia" pokazująca:
  - listę komentarzy z `is_pending_review = true` (autor, treść, post, wykryte słowa, data),
  - akcje: **Zatwierdź**, **Odrzuć (usuń)**, **Edytuj i zatwierdź**.
- Sekcja „Lista zakazanych słów" – CRUD na `news_hub_comment_banned_words` z masowym dodawaniem (po przecinku / nowej linii). Wgramy startową listę polskich/angielskich wulgaryzmów (do potwierdzenia – pytanie 2).

### 5. Drobne UX
- Przycisk **Usuń** dostaje natychmiastowe ukrycie wiersza + animacja (fade-out).
- Pod komentarzem oczekującym na moderację (widocznym dla autora) plakietka „Oczekuje na zatwierdzenie przez administratora".
- Dymek tooltipa przy „Edytuj" pokazuje pozostały czas (np. „Możliwe przez 4 min 12 s").

### Szczegóły techniczne
- Migracja:
  - `alter table news_hub_comments add column is_pending_review boolean not null default false, add column flagged_words text[] not null default '{}', add column reviewed_by uuid, add column reviewed_at timestamptz, add column review_decision text;`
  - `create table news_hub_comment_banned_words(...)` + GRANT + RLS (admin/moderator zarządza, `authenticated` tylko `select` jeśli potrzebne – domyślnie brak).
  - Funkcja `scan_comment_profanity` + trigger `trg_news_hub_comments_moderation`.
  - Nowe policies UPDATE/DELETE z warunkiem 5 minut + `has_role('admin')`/`has_moderator_module(..., 'news_hub')`.
- Realtime już obejmuje `news_hub_comments` – panel admina dostaje nowe zgłoszenia od razu.

### Pytania (przed implementacją)
1. **Powiadomienie admina o nowym zgłoszeniu**: tylko czerwona plakietka w `/admin/news-hub` (licznik), czy dodatkowo wpis w `notifications` (dzwoneczek) i/lub email?
2. **Lista zakazanych słów na start**: czy mam załadować standardową polską listę wulgaryzmów (≈100 słów) jako seed, czy zostawić pustą i pozwolić adminowi samemu uzupełnić?
3. Czy okno **5 minut** dotyczy też **usunięcia własnego komentarza**, czy autor może go usunąć w dowolnym momencie (a tylko edycja ma limit 5 minut)?
