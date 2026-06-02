## Problem
Upload kończy się błędem `Bucket not found`, bo w Supabase nie istnieje jeszcze bucket Storage `intro-videos` albo migracja tworząca bucket nie została zastosowana w bazie.

## Plan naprawy
1. Dodać/uruchomić migrację Supabase, która idempotentnie tworzy publiczny bucket `intro-videos` z limitem 20 MB i typami MIME: `video/mp4`, `video/webm`, `video/quicktime`.
2. Zachować istniejące polityki RLS dla `storage.objects`: publiczny odczyt, upload/edycja/usuwanie tylko dla administratorów.
3. Dodać w panelu admina czytelniejszy komunikat dla błędu `Bucket not found`, np. „Magazyn wideo nie jest jeszcze skonfigurowany — zastosuj migrację Supabase”.
4. Po wdrożeniu sprawdzić ponownie upload MP4 w zakładce `/admin?tab=intro-video`.

## Szczegóły techniczne
- Bucket zostanie utworzony przez `INSERT INTO storage.buckets (...) ON CONFLICT (id) DO UPDATE ...`, więc migracja będzie bezpieczna przy ponownym uruchomieniu.
- Kod uploadu nadal będzie korzystał z `supabase.storage.from('intro-videos').upload(...)`.
- Nie zmieniam działania samego intro — naprawiam wyłącznie przyczynę błędu uploadu i komunikat diagnostyczny.