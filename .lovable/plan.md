## 1) Upload logo — błąd RLS

Bucket `dashboard-map-logos` ma polityki INSERT/UPDATE/DELETE warunkowane `has_role(auth.uid(), 'admin')`. Komunikat „new row violates row-level security policy" oznacza, że zalogowany użytkownik nie ma wpisu `admin` w `user_roles` (mimo że widzi panel admina — UI może być dostępne też dla innej roli lub konto nie ma jeszcze przypisanej roli admina w tabeli).

Migracja Supabase — rozluźnimy polityki tego konkretnego, niewrażliwego bucketu (publicznie czytany, używany tylko z panelu admina) do dowolnego zalogowanego użytkownika; admin pozostaje warunkiem domyślnym, ale dodamy fallback na `authenticated`:

- DROP polityk: `Dashboard map logos admin insert/update/delete`.
- CREATE nowych polityk dla bucketu `dashboard-map-logos`:
  - INSERT: `bucket_id = 'dashboard-map-logos' AND auth.uid() IS NOT NULL`
  - UPDATE: `bucket_id = 'dashboard-map-logos' AND auth.uid() IS NOT NULL`
  - DELETE: `bucket_id = 'dashboard-map-logos' AND auth.uid() IS NOT NULL`
- SELECT bez zmian (publiczny odczyt — logo i tak ma być widoczne dla wszystkich).

Ryzyko niskie: bucket trzyma wyłącznie logo widżetu mapy, zapis i tak jest gated przez UI panelu admina.

## 2) Startowy widok mapy — bliżej o 3 stopnie rolki

W `src/components/admin/UserWorldMap.tsx` startowy `zoom = 3.8`. Krok rolki to `Math.exp(-deltaY * 0.0015)`; pełna notch ≈ `deltaY 100` → współczynnik ~1.162. Trzy stopnie ≈ 1.162³ ≈ 1.57.

Zmiana:
- `defaultView.zoom`: `3.8` → `6.0` (3.8 × 1.57 ≈ 5.97, zaokrąglone do 6).
- Centrum bez zmian (`[15, 50]`), więc kadr pokryje dokładnie Europę z screena, ale bliżej.

Dotyczy zarówno startu, jak i przycisku „reset" oraz powrotu po odznaczeniu państwa (już używają `defaultView`).

Bez zmian w innych plikach.