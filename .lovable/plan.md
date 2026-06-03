## 1. Moderatorzy – wybór spośród istniejących użytkowników

**Problem:** obecnie w `ModeratorsManagement.tsx` jest tylko wpisanie e-maila i `insert` do `user_roles`. Insert leci pod RLS jako zwykły user → wpis się nie zapisuje, a w UI pojawia się fałszywy „dodano". Dodatkowo trzeba wyszukiwać po imieniu / nazwisku / EQ ID / e-mailu.

**Zmiany:**
- Zamienić pole „email" na **wyszukiwarkę użytkowników** (Command/Combobox) z debouncem:
  - zapytanie do `profiles` z `ilike` po `full_name`, `email`, `eq_id` (limit 20)
  - lista wyników z imieniem, e-mailem, EQ ID i przyciskiem „Ustaw moderatorem"
- Dodawanie moderatora i wszystkie operacje na `user_roles` przenieść do nowej Edge Function **`admin-set-moderator`** (działa jako admin, omija RLS, wymaga `verifyAdmin`):
  - `action: 'add'` → upsert do `user_roles` (role=moderator) + upsert do `moderator_permissions`
  - `action: 'remove'` → delete z obu tabel
  - `action: 'update_modules'` → upsert `moderator_permissions.modules`
  - wszystko logowane przez `admin_activity_log`
- Aktualne polityki RLS na `user_roles` zostają nietknięte (bezpieczeństwo).

## 2. Precyzyjne moduły / podmoduły / pojedyncze treści

Rozszerzyć `PREDEFINED_MODULES` w `ModeratorsManagement.tsx` o pełną mapę zakładek Admin Sidebar + podmoduły dla:
- News Hub: `news_hub`, `news_hub:create`, `news_hub:edit`, `news_hub:delete`, `news_hub:publish`, `news_hub:visibility`, `news_hub:categories`, `news_hub:templates`
- Eventy: `events`, `events:create`, `events:edit`, `events:delete`, `paid-events`, `event-registrations`, `partner-pages`, `meeting-guests`, `event-forms`
- Wiedza / Komunikacja: analogicznie z sufiksami `:create/:edit/:delete`
- Pole **„Konkretne treści (ID-y)"** – JSON-lista per-moduł, np. `news_hub.allowed_post_ids: [uuid, uuid]`. Pusta lista = wszystko, lista = tylko te wpisy. Walidowane po stronie UI (komponenty Aktualności wczytują listę z `useModeratorAccess`).

Hook `useModeratorAccess`:
- dodać `canAction(module, action)` – sprawdza `modules['news_hub']` **oraz** `modules['news_hub:edit']` (jeśli admin zdefiniował granularnie)
- dodać `allowedIds(module): string[] | 'all'`
- użyć w `NewsHubAdminPage`, `PostFormDialog`, `EventsManagement`, etc. do warunkowego ukrywania przycisków Edytuj/Usuń/Publikuj i filtrowania listy.

## 3. Panel CMS + bramka hasłem dla moderatora

- `src/components/Header.tsx` (linia 224): warunek `isAdmin ?` → `hasAnyAdminAccess ?` z `useModeratorAccess`, etykieta „Panel CMS" / `nav.admin`.
- `src/pages/Admin.tsx` (linia 3045): warunek `isAdmin && !gateUnlocked` → `hasAnyAdminAccess && !gateUnlocked`. Moderator też musi przejść `AdminPasswordGate`.
- `src/pages/NewsHubAdminPage.tsx`: dodać identyczny gate (jeśli moderator ma tylko `news_hub` i wchodzi prosto na `/admin/news-hub`).
- `AdminPasswordGate` weryfikuje hasło przez Edge Function (już istnieje) – działa tak samo dla admin i moderator (oboje musieli wcześniej dostać hasło od admina).

## 4. Stabilność – żadnych regresji

- Wszystkie nowe sprawdzenia działają **dodatkowo** do `isAdmin` (admin zawsze ma pełny dostęp – `can()` zwraca true).
- Brak zmian w istniejących RLS, edge funkcjach, hookach – tylko nowy edge function `admin-set-moderator` + nowe wpisy w `moderator_permissions.modules`.
- Migracja: brak zmian schema, JSONB `modules` już obsługuje dowolne klucze.
- Testy ręczne: admin loguje się jak dotychczas, moderator otrzymuje wybrane zakładki, próba wejścia w nieprzyznany moduł → redirect na `/dashboard`.

## 5. Upload wideo 180 MB w Aktualnościach (macOS)

**Problem:** `uploadNewsHubFile` ładuje plik bezpośrednio do bucketu `news-hub-media` przez Supabase Storage SDK. Plik 180 MB przekracza praktyczny limit dla single-PUT przeglądarki (timeout / 413) → „Błąd uploadu".

**Rozwiązanie (zgodne z istniejącą polityką VPS uploads):**
- Zmodyfikować `uploadNewsHubFile` w `src/hooks/useNewsHub.ts`:
  - jeśli `file.size > STORAGE_CONFIG.SUPABASE_MAX_SIZE_BYTES` (2 MB) → użyć XHR POST na `/upload` (Express VPS, ten sam endpoint co Akademia), folder `news-hub/<folder>`
  - w przeciwnym razie zostawić dotychczasowy Supabase upload (małe okładki/obrazki)
- W `PostFormDialog.tsx` dodać **realny pasek postępu** (XHR `progress` event) i komunikat „Wysyłanie ... %" zamiast samego spinnera.
- Zwiększyć timeout XHR do 10 min dla plików > 50 MB.
- Walidacja typu po stronie klienta: `STORAGE_CONFIG.ALLOWED_TYPES.video`.

**Uwaga produkcyjna:** zakładamy, że na produkcji (cyberfolks/PM2) endpoint `/upload` jest dostępny – tak samo używa go Akademia. Jeśli nie odpowiada, użytkownik dostanie czytelny komunikat „Serwer VPS niedostępny" (już obsłużone w `useLocalStorage.ts`).

## Techniczne pliki do zmiany

```text
src/components/admin/ModeratorsManagement.tsx   (wyszukiwarka, granularne moduły, edge function calls)
src/hooks/useModeratorAccess.ts                  (canAction, allowedIds)
src/components/Header.tsx                        (Panel CMS dla moderatora)
src/pages/Admin.tsx                              (gate dla hasAnyAdminAccess)
src/pages/NewsHubAdminPage.tsx                   (gate hasłem)
src/hooks/useNewsHub.ts                          (routing > 2 MB do VPS, progress)
src/components/news-hub/PostFormDialog.tsx       (pasek postępu, komunikaty)
supabase/functions/admin-set-moderator/index.ts  (NOWY – admin-only CRUD na rolach)
```

Brak migracji SQL – wszystko mieści się w istniejącym schemacie `moderator_permissions` (JSONB `modules`).
