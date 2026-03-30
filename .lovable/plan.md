

## Problem: Nie można zapisać się na żadne wydarzenie

### Przyczyna

Błąd w konsoli: `duplicate key value violates unique constraint "event_registrations_event_user_occurrence_key"`

Constraint `UNIQUE (event_id, user_id, occurrence_index)` jest niezgodny z kodem rejestracji, który szuka istniejących wpisów po `occurrence_date` + `occurrence_time` (nie po `occurrence_index`).

**Scenariusz awarii:** Użytkownik ma starą rejestrację z `occurrence_index=0, occurrence_date=2026-03-09`. Próbuje zapisać się na nowy termin z `occurrence_index=0, occurrence_date=2026-03-30`. Kod szuka po dacie → nie znajduje → próbuje INSERT → constraint na `(event_id, user_id, occurrence_index=0)` blokuje.

### Rozwiązanie

**1. Migracja SQL — zmiana unique constraint**

Zamienić stary constraint oparty na `occurrence_index` na nowy oparty na `occurrence_date` + `occurrence_time` (zgodny z kodem):

```sql
-- Usuń stary constraint
ALTER TABLE event_registrations 
DROP CONSTRAINT event_registrations_event_user_occurrence_key;

-- Nowy constraint na date+time (stabilny)
CREATE UNIQUE INDEX event_registrations_event_user_date_time_key 
ON event_registrations (event_id, user_id, occurrence_date, occurrence_time);

-- Osobny partial index dla wpisów bez daty (legacy/jednorazowe)
CREATE UNIQUE INDEX event_registrations_event_user_no_date_key 
ON event_registrations (event_id, user_id) 
WHERE occurrence_date IS NULL AND occurrence_time IS NULL;
```

**2. Czyszczenie danych — usunięcie resztek index=3**

Dwa rekordy wciąż mają `occurrence_index=3` i status `registered`. Trzeba je naprawić (ustawić index na 0 lub anulować duplikaty).

### Pliki do zmiany

1. **Nowa migracja SQL** — zmiana constraint + czyszczenie danych

Brak zmian w kodzie frontendowym — `useEvents.ts` już poprawnie szuka po `occurrence_date`/`occurrence_time`.

