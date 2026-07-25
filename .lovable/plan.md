## Co jest teraz (sprawdzone w bazie)

Funkcja `get_user_location_points()` filtruje obecnie: `is_active = true` **i** `blocked_at IS NULL` **i** niepuste `city`, `country`, `postal_code`.

Liczby w bazie (260 profili):
- z miastem i kodem pocztowym: **170**
- z miastem i kodem pocztowym, niezablokowani: **96** (to będzie nowy zbiór na mapie)
- obecnie widocznych (z `is_active = true`): mniej — dlatego mapa gubiła użytkowników
- profili z miastem+kodem, ale bez kraju: **1**

## Plan zmiany

### 1. Migracja: nowe reguły w `get_user_location_points()`
Nowy warunek widoczności na mapie:
- **usunięcie** warunku `is_active` (aktywność sesji/konta nie ma znaczenia),
- **pozostaje** `blocked_at IS NULL` — zablokowani nie pojawiają się na mapie,
- wymagane dane adresowe: niepuste `city` **i** `postal_code`,
- `country` przestaje być warunkiem wykluczającym — jeśli jest puste, funkcja próbuje uzupełnić kraj z kodu pocztowego/istniejącego cache geokodowania, a gdy to niemożliwe, zwraca pusty kraj (taki punkt trafia na mapę po samym mieście, nie znika),
- profile w trakcie usuwania konta (`deletion_status` inne niż `none`) nadal pomijane (obecnie 0 takich).

### 2. Mapa (`src/components/admin/UserWorldMap.tsx`)
- Grupowanie bez zmian (miasto+kraj), z tym że dla rekordów bez kraju klucz to samo miasto — geokodowanie z kodem pocztowym jako podpowiedzią.
- Licznik „X / Y zlokalizowanych" oraz popupy krajów liczone na tej samej, nowej liście, żeby nie było rozjazdu między napisem a znacznikami.

## Szczegóły techniczne
- Zmiana wyłącznie w funkcji SQL `get_user_location_points()` (SECURITY DEFINER, `SET search_path TO public`) + drobna korekta grupowania/liczników w `UserWorldMap.tsx`.
- Cache `localStorage` (`userWorldMap.userPoints.v1`) zostanie odświeżony przy pierwszym pobraniu nowych danych; podbijemy wersję klucza, żeby stare (przefiltrowane) punkty nie zostały pokazane po zmianie.
