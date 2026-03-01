
# Wyswietlanie zablokowanych uzytkownikow w strukturze organizacji

## Problem
Funkcja RPC `get_organization_tree` filtruje `WHERE p.is_active = true`, wiec zablokowany uzytkownik (z `is_active = false`) calkowicie znika z drzewa struktury u lidera. Powinien nadal byc widoczny, ale z oznaczeniem "Zablokowany".

## Zmiany

### 1. Migracja SQL - Modyfikacja `get_organization_tree`
Zmiana RPC tak, aby zwracala rowniez nieaktywnych uzytkownikow (z `is_active = false`) oraz dodanie kolumny `is_active` do wyniku.

Zmiana polega na:
- Usunienciu warunku `AND p.is_active = true` z rekurencyjnego CTE (pozostawienie go tylko dla roota, aby lider zawsze sie widzial)
- Dodaniu kolumny `p.is_active` do wyniku funkcji

```sql
CREATE OR REPLACE FUNCTION get_organization_tree(p_root_eq_id text, p_max_depth int DEFAULT 5)
RETURNS TABLE(
  id uuid, first_name text, last_name text, eq_id text,
  upline_eq_id text, role text, avatar_url text,
  email text, phone_number text, level int, is_active boolean
) ...
-- Root: WHERE p.eq_id = p_root_eq_id AND p.is_active = true
-- Children: usunac AND p.is_active = true (aby zablokowane osoby tez sie pojawialy)
```

### 2. Aktualizacja interfejsu `OrganizationMember` (`src/hooks/useOrganizationTree.ts`)
Dodanie pola `is_active` do interfejsu i mapowania danych.

### 3. Aktualizacja `OrganizationList.tsx` - badge "Zablokowany"
- Przy kazdym uzytkowniku z `is_active === false` wyswietlic czerwony Badge "Zablokowany"
- Ukryc przycisk blokowania dla juz zablokowanych uzytkownikow
- Lekko wyszarzyc wiersz zablokowanego uzytkownika (opacity)

### 4. Weryfikacja strony admina
Admin CMS juz poprawnie wyswietla zablokowanych uzytkownikow w zakladce "Zablokowani" (filtruje po `is_active = false` z danymi z `user_blocks`). Ta czesc dziala - admin widzi zablokowanych. Nie sa potrzebne dodatkowe zmiany po stronie admina.

## Kolejnosc implementacji
1. Migracja SQL (modyfikacja RPC)
2. Aktualizacja interfejsu `OrganizationMember`
3. Aktualizacja komponentu `OrganizationList.tsx` (badge + ukrycie przycisku blokowania)
