
## Część 1 — Wgrywanie wideo z komputera w bloku „Wideo"

### Problem
W edytorze postu News Hub blok „Wideo" pozwala tylko wkleić URL (YouTube/Vimeo/mp4). Brak przycisku „Wgraj plik z komputera" — stąd nie można dodać własnego nagrania.

`src/components/news-hub/editor/BlockListEditor.tsx` (case `'video'`, linia 271-277) renderuje wyłącznie dwa `<Input>`-y. Tymczasem w sąsiednim case `'file_download'` używany jest już `FileUploadInput`, który pod spodem korzysta z `useLocalStorage().uploadFile()` (ten sam mechanizm działa np. w `FileDownloadEditor.tsx`).

### Zmiana (czysto UI, bez ruszania logiki biznesowej)
W `BlockListEditor.tsx` w case `'video'`:
1. Dodać `FileUploadInput` z `accept="video/*"` i folderem `news-hub-videos` — wynikowy URL trafia do `d.url`.
2. Pod nim zostawić istniejący `<Input>` z URL (dla YouTube/Vimeo) — etykieta: „...lub wklej link YouTube / Vimeo / mp4".
3. Pasek postępu i komunikat (już są w `useLocalStorage`).
4. Walidacja MIME (`video/mp4`, `video/webm`, `video/quicktime`) i limit 2 GB (już obsługiwane przez `storageConfig`).

### Co NIE jest ruszane
- `VideoPlayer` w `PostContent.tsx` — już teraz obsługuje YouTube/Vimeo/`<video src>`, więc wgrany plik zadziała bez zmian.
- Typ `VideoBlockData` (pole `url`) — bez zmian.
- RLS, bucket policy storage — wykorzystujemy istniejący bucket `local-uploads`.

### Pliki do edycji
- `src/components/news-hub/editor/BlockListEditor.tsx` (~6 linii w case `'video'`)

---

## Część 2 — Rola „Moderator" z ograniczonym dostępem do panelu admina

Aktualne role (`app_role` enum): `admin`, `partner`, `client`, `specjalista`, `user`. Cały panel admina sprawdza `isAdmin` z `AuthContext`. Dodanie roli wymaga rozważnego podejścia, żeby NIE rozbić istniejących RLS i sprawdzeń.

Propozycje (proszę wybrać jedną — zaimplementuję dopiero po akceptacji):

### Opcja A — Nowa rola `moderator` w enumie + flagi modułów (rekomendowana)
- Dodaję `'moderator'` do enum `app_role` (migracja `ALTER TYPE ... ADD VALUE`).
- Nowa tabela `moderator_permissions` (user_id + boolean flagi: `can_manage_news_hub`, `can_manage_events`, `can_manage_cms`, `can_manage_users_readonly`, `can_manage_training`, `can_manage_support` itd.).
- W `AuthContext` dodaję `isModerator` i `moderatorPerms`.
- W `App.tsx`/routach: ścieżki `/admin/...` dostępne dla `isAdmin || (isModerator && perms.<flag>)`.
- W UI sidebara Admina pokazuję tylko sekcje na które moderator ma uprawnienia.
- Wszystkie obecne `has_role(auth.uid(),'admin')` w RLS pozostają nietknięte — moderator widzi panel, ale operacje wrażliwe (usuwanie userów, zmiana ról, e-maile, klucze API) zostają wyłącznie dla admina.
- Plusy: czyste, audytowalne, granularne.
- Minusy: migracja DB + jedna tabela + UI do zarządzania uprawnieniami.

### Opcja B — Bez zmian w enumie, tylko tabela `admin_panel_access`
- Zostawiamy enum `app_role` bez ruchu.
- Tabela `admin_panel_access(user_id, module text, can_read bool, can_write bool)`.
- `AuthContext` ładuje uprawnienia i wystawia `hasAdminPanelAccess(module)`.
- Routy/sidebar używają tej funkcji obok `isAdmin`.
- Plusy: zero ryzyka dla obecnych RLS (enum nietknięty), najszybsze do wdrożenia.
- Minusy: rola „moderator" jest tylko UI-owa — w bazie taka osoba dalej jest `user/partner`.

### Opcja C — Współdzielony „delegowany admin" (najprostsza)
- Tylko tabela `admin_delegates(user_id, modules text[])`.
- Brak ról, brak enumu, brak granularnych flag — moderator dostaje listę modułów (np. `['news_hub','events']`) i w tych modułach ma pełne prawa admina.
- Plusy: minimalna implementacja, łatwe do cofnięcia.
- Minusy: brak rozróżnienia read/write.

### Wspólne dla wszystkich opcji
- Strona `Admin → Moderatorzy` (lista + checkboxy modułów + przycisk „Dodaj moderatora" wyszukujący po e-mailu).
- Log w `admin_activity_log` przy każdej zmianie uprawnień.
- Akcje krytyczne (kasowanie kont, zmiana ról, klucze API, zarządzanie adminami) — TYLKO admin, nigdy moderator.

### Sugerowany zestaw modułów do delegacji
News Hub · Eventy · CMS / Strony · Centrum Wiedzy · Szkolenia · Wsparcie/Support · Statystyki (read-only) · CRM (read-only)

---

## Kolejność wdrożenia
1. Po akceptacji — najpierw **Część 1** (mała, niezależna zmiana UI).
2. Następnie **Część 2** w wybranym wariancie (A/B/C) — osobna iteracja z migracją.

Proszę o:
- potwierdzenie Części 1,
- wybór wariantu A / B / C dla Części 2 oraz wskazanie modułów, do których moderator ma mieć dostęp.
