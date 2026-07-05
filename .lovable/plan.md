## Problem

Toast pokazuje ogólny „Nie udało się przesłać pliku" — nie wiadomo, co dokładnie zawiodło (upload do storage vs update profiles). Obecny kod (`src/components/dashboard/UserProfileCard.tsx`) wrzuca avatar do bucketu `cms-images` pod ścieżkę `avatars/<uid>-<ts>.<ext>` i łapie każdy błąd tym samym komunikatem.

Prawdopodobne przyczyny (po sprawdzeniu bazy):
- Bucket `cms-images` ma politykę INSERT ograniczoną do adminów lub `authenticated`, ale zapisuje jako obiekt globalny — nie jest to bucket dla plików per‑user. Konflikt `upsert` po nazwie może odpalić UPDATE, a polityka UPDATE wymaga `is_admin()` — dla nie‑adminów rzuca RLS.
- Brak dedykowanego bucketu `avatars` z sensownymi politykami per‑user.
- Ogólny catch maskuje prawdziwy komunikat Supabase.

## Rozwiązanie

1. **Nowy publiczny bucket `avatars`** (2 MB limit, MIME image/*) tworzony przez tool storage.
2. **RLS na `storage.objects`** dla bucketu `avatars`:
   - SELECT: publiczne (żeby avatar był widoczny wszędzie).
   - INSERT/UPDATE/DELETE: użytkownik może zarządzać wyłącznie plikami w folderze `auth.uid()/…` (ścieżka `<uid>/plik.ext`).
   - Admin: pełny dostęp (przez `is_admin()`).
3. **Poprawka `UserProfileCard.tsx`**:
   - Upload do `avatars` w ścieżkę `${user_id}/${ts}.${ext}` (bez `upsert`, żeby uniknąć starcia z UPDATE policy).
   - Po sukcesie odczyt publicznego URL z bucketu `avatars`.
   - W toast pokazać realny `error.message` z Supabase (zamiast generycznego „Nie udało się przesłać pliku"), plus `console.error` z pełnym obiektem — łatwiej diagnozować, gdyby coś jeszcze nie grało.
   - Opcjonalnie: skasować stary plik użytkownika po udanym uploadzie (żeby nie puchło storage).
4. Nic więcej nie ruszamy (logika reszty aplikacji bez zmian). Istniejące avatary w `cms-images` nadal działają, bo `avatar_url` to pełny publiczny URL.

## Pliki

- `supabase/migrations/<new>.sql` — polityki na `storage.objects` dla bucketu `avatars`.
- Storage bucket `avatars` — utworzony przez `supabase--storage_create_bucket` (public=true, 2 MB, image mime).
- `src/components/dashboard/UserProfileCard.tsx` — zmiana bucketu, ścieżki uploadu i komunikatu błędu.
