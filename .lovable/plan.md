

# Naprawa weryfikacji certyfikatów Szybki Start

## Problem
Funkcja `leader_get_team_auto_webinar_access` pobiera dane **z tabeli `leader_permissions`** jako bazy (`FROM leader_permissions`), ale tylko **11 z 206** członków zespołu Dawida ma w niej rekord. Pozostali 195 użytkowników w ogóle nie pojawia się w wynikach — frontend traktuje ich jako "brak certyfikatu", mimo że **83 osób faktycznie posiada certyfikat** w tabeli `certificates`.

## Przyczyna
```sql
-- OBECNE (błędne) — pomija użytkowników bez rekordu w leader_permissions
FROM leader_permissions lp
LEFT JOIN certificates c ON c.user_id = lp.user_id ...
WHERE lp.user_id = ANY(p_user_ids);
```

## Rozwiązanie
Zmiana bazy zapytania z `leader_permissions` na `unnest(p_user_ids)` — tak aby każdy członek zespołu był uwzględniony, a dopiero potem LEFT JOIN do `leader_permissions` (po `can_access_auto_webinar`) i `certificates` (po certyfikat).

```sql
-- POPRAWIONE
RETURN QUERY
SELECT 
  u.uid,
  COALESCE(lp.can_access_auto_webinar, false),
  (c.id IS NOT NULL)
FROM unnest(p_user_ids) AS u(uid)
LEFT JOIN leader_permissions lp ON lp.user_id = u.uid
LEFT JOIN certificates c ON c.user_id = u.uid 
  AND c.module_id = '7ba86537-309a-479a-a4d2-d8636acb2148'
```

## Weryfikacja danych
- Zespół Dawida: **206 osób**
- Z certyfikatem Szybki Start: **83 osób** (a nie ~6 jak pokazuje obecny widok)
- Z rekordem w `leader_permissions`: tylko **11 osób** ← tu jest problem

## Zmiana
Jedna migracja SQL — `DROP` + `CREATE OR REPLACE` funkcji `leader_get_team_auto_webinar_access`. Żadne zmiany w kodzie frontendu nie są potrzebne — struktura zwracanych danych pozostaje identyczna.

