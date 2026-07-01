## Problem

Nie da się zapisać kontaktu — Postgres zwraca:
`new row for relation "team_contacts" violates check constraint "team_contacts_priority_level_range"`

## Przyczyna

W bazie constraint dopuszcza `priority_level` tylko w zakresie **0–5**:

```
CHECK ((priority_level >= 0) AND (priority_level <= 5))
```

Natomiast frontend (`priority_traits`: 5 cech × 0–5 gwiazdek) sumuje wartości i wysyła **0–25**. Twój przypadek: 2+4+5+… = powyżej 5 → błąd.

## Naprawa

Migracja SQL, która podnosi górny limit constraintu z 5 do 25:

```sql
ALTER TABLE public.team_contacts
  DROP CONSTRAINT team_contacts_priority_level_range;

ALTER TABLE public.team_contacts
  ADD CONSTRAINT team_contacts_priority_level_range
  CHECK (priority_level >= 0 AND priority_level <= 25);
```

Bez zmian w kodzie frontend — logika sumowania 5 cech pozostaje.
