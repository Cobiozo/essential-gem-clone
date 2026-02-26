

## Problem

Funkcja `check_event_conflicts` sprawdza kolizje tylko po kolumnach `start_time`/`end_time`. Wydarzenia z wieloma terminami (`occurrences` jsonb) maja w `start_time` date pierwszego terminu, wiec kolizje z pozniejszymi terminami (np. 27.02) nie sa wykrywane.

Dodatkowo, formularz `TeamTrainingForm` przy tworzeniu wydarzenia wieloterminowego sprawdza kolizje tylko dla **pierwszego** occurrence - nie dla wszystkich.

## Rozwiazanie

### Zmiana 1: Rozszerzenie funkcji SQL `check_event_conflicts`

Zaktualizowac funkcje RPC aby sprawdzala kolizje w trzech scenariuszach:

1. **Nowe wydarzenie vs istniejace bez occurrences** - porownanie z `start_time`/`end_time` (jak dotychczas)
2. **Nowe wydarzenie vs istniejace Z occurrences** - rozwiniecie `jsonb_array_elements` i obliczenie czasu startu/konca kazdego terminu, porownanie z zakresem nowego wydarzenia

Funkcja otrzyma te same parametry (`p_start_time`, `p_end_time`, `p_exclude_event_id`), wiec interfejs nie zmienia sie.

```text
Logika SQL:
  -- Czesc 1: wydarzenia BEZ occurrences (jak dotychczas)
  SELECT ... FROM events
  WHERE occurrences IS NULL
    AND start_time < p_end_time AND end_time > p_start_time

  UNION

  -- Czesc 2: wydarzenia Z occurrences (nowa logika)
  SELECT DISTINCT ... FROM events,
    jsonb_array_elements(occurrences) AS occ
  WHERE occurrences IS NOT NULL
    AND obliczony_start < p_end_time
    AND obliczony_end > p_start_time
```

Obliczenie czasu z occurrences:
- `date` + `time` -> timestamp (np. "2026-02-27" + "17:00" -> timestamptz)
- `+ duration_minutes * interval '1 minute'` -> koniec

### Zmiana 2: Sprawdzanie WSZYSTKICH occurrences w TeamTrainingForm

Obecnie `TeamTrainingForm` sprawdza kolizje tylko dla pierwszego occurrence. Trzeba wywolac `check_event_conflicts` dla **kazdego** occurrence z listy i zebrac wszystkie konflikty.

**Plik: `src/components/admin/TeamTrainingForm.tsx`** (linie ~195-210)

Zamiast:
```
const firstOcc = occurrences[0];
// ... oblicz startTime/endTime tylko dla pierwszego
const { data } = await supabase.rpc('check_event_conflicts', { p_start_time: startTime, p_end_time: endTime, ... });
```

Nowa logika:
```
// Dla kazdego occurrence sprawdz kolizje
let allConflicts = [];
for (const occ of occurrences) {
  const { data } = await supabase.rpc('check_event_conflicts', {
    p_start_time: occStart, p_end_time: occEnd, ...
  });
  if (data?.length) allConflicts.push(...data);
}
// Deduplikacja po id
```

### Podsumowanie zmian

| Element | Zmiana |
|---------|--------|
| Migracja SQL | `DROP` + `CREATE` nowej wersji `check_event_conflicts` z obsluga `occurrences` jsonb |
| `TeamTrainingForm.tsx` | Petla po wszystkich occurrences zamiast sprawdzania tylko pierwszego |
| `WebinarForm.tsx` | Bez zmian (webinary nie maja wieloterminowosci) |

### Szczegoly techniczne SQL

Konwersja z occurrences jsonb na timestamp:
```sql
(occ->>'date')::date + (occ->>'time')::time  -- daje timestamp without tz
-- Konwersja do timestamptz z timezone Warsaw:
((occ->>'date') || ' ' || (occ->>'time'))::timestamp AT TIME ZONE 'Europe/Warsaw'
```

Czas konca:
```sql
start_ts + ((occ->>'duration_minutes')::int * interval '1 minute')
```
